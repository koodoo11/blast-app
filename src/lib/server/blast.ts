import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { env } from '$env/dynamic/private';
import {
	MAX_SEQUENCE_LENGTH,
	BLAST_PROGRAMS,
	type BlastProgram,
	type BlastHit,
	type BlastResult
} from '$lib/blast/types';

export { MAX_SEQUENCE_LENGTH, BLAST_PROGRAMS, type BlastProgram, type BlastHit, type BlastResult };

const execFileAsync = promisify(execFile);

const NUCLEOTIDE_PATTERN = /^[ACGTUNRYSWKMBDHV\s]+$/i;
const VALID_SEQUENCE_CHARS = /^[A-Za-z*\-\s]+$/;

export class BlastError extends Error {}

function detectProgram(sequence: string): BlastProgram {
	return NUCLEOTIDE_PATTERN.test(sequence) ? 'blastx' : 'blastp';
}

function toFasta(sequence: string): string {
	const trimmed = sequence.trim();
	return trimmed.startsWith('>') ? trimmed : `>query\n${trimmed}`;
}

function extractResidues(sequence: string): string {
	return sequence
		.split('\n')
		.filter((line) => !line.startsWith('>'))
		.join('')
		.replace(/\s+/g, '');
}

export async function runBlast(
	inputSequence: string,
	requestedProgram?: BlastProgram
): Promise<BlastResult> {
	const residues = extractResidues(inputSequence);
	if (!residues) {
		throw new BlastError('Sequence is empty');
	}
	if (residues.length > MAX_SEQUENCE_LENGTH) {
		throw new BlastError(`Sequence exceeds maximum length of ${MAX_SEQUENCE_LENGTH}`);
	}
	if (!VALID_SEQUENCE_CHARS.test(residues)) {
		throw new BlastError('Sequence contains invalid characters');
	}

	const detected = detectProgram(residues);
	if (requestedProgram && requestedProgram !== detected) {
		throw new BlastError(
			`Requested program '${requestedProgram}' does not match sequence type (detected '${detected}')`
		);
	}
	const program = requestedProgram ?? detected;

	const dbPath = env.BLAST_DB_PATH;
	if (!dbPath) {
		throw new BlastError('BLAST_DB_PATH is not configured');
	}
	const workDir = await mkdtemp(join(tmpdir(), 'blast-'));
	const queryPath = join(workDir, 'query.fasta');

	try {
		await writeFile(queryPath, toFasta(residues), 'utf-8');

		const { stdout } = await execFileAsync(program, [
			'-query',
			queryPath,
			'-db',
			dbPath,
			'-outfmt',
			'15',
			'-max_target_seqs',
			'10'
		]);

		const { queryLength, hits } = parseBlastJson(stdout);
		return { program, queryLength, hits };
	} catch (err) {
		if (err instanceof BlastError) throw err;
		const message = err instanceof Error ? err.message : String(err);
		throw new BlastError(`BLAST execution failed: ${message}`);
	} finally {
		await rm(workDir, { recursive: true, force: true });
	}
}

function parseBlastJson(stdout: string): { queryLength: number; hits: BlastHit[] } {
	let parsed: unknown;
	try {
		parsed = JSON.parse(stdout);
	} catch {
		throw new BlastError('Failed to parse BLAST output');
	}

	const search = (parsed as any)?.BlastOutput2?.[0]?.report?.results?.search;
	const queryLength = search?.query_len ?? 0;
	const hits = search?.hits ?? [];

	const parsedHits = hits.map((hit: any) => {
		const hsp = hit.hsps[0];
		return {
			id: hit.description?.[0]?.id ?? '',
			accession: hit.description?.[0]?.accession ?? '',
			description: hit.description?.[0]?.title ?? '',
			identity: hsp.identity / hsp.align_len,
			alignmentLength: hsp.align_len,
			mismatches: hsp.align_len - hsp.identity - hsp.gaps,
			gapOpens: hsp.gaps,
			queryStart: hsp.query_from,
			queryEnd: hsp.query_to,
			hitStart: hsp.hit_from,
			hitEnd: hsp.hit_to,
			evalue: hsp.evalue,
			bitScore: hsp.bit_score,
			querySeq: hsp.qseq ?? '',
			hitSeq: hsp.hseq ?? '',
			midline: hsp.midline ?? ''
		} satisfies BlastHit;
	});

	return { queryLength, hits: parsedHits };
}
