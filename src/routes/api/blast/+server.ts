import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	runBlast,
	BlastError,
	MAX_SEQUENCE_LENGTH,
	BLAST_PROGRAMS,
	type BlastProgram
} from '$lib/server/blast';

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON body');
	}

	if (typeof body !== 'object' || body === null) {
		error(400, 'Request body must be a JSON object');
	}

	const { sequence, program } = body as Record<string, unknown>;

	if (typeof sequence !== 'string' || sequence.trim().length === 0) {
		error(400, '"sequence" is required and must be a non-empty string');
	}
	if (sequence.length > MAX_SEQUENCE_LENGTH) {
		error(400, `"sequence" exceeds maximum length of ${MAX_SEQUENCE_LENGTH}`);
	}

	let requestedProgram: BlastProgram | undefined;
	if (program !== undefined) {
		if (typeof program !== 'string' || !BLAST_PROGRAMS.includes(program as BlastProgram)) {
			error(400, `"program" must be one of: ${BLAST_PROGRAMS.join(', ')}`);
		}
		requestedProgram = program as BlastProgram;
	}

	try {
		const result = await runBlast(sequence, requestedProgram);
		return json(result);
	} catch (err) {
		if (err instanceof BlastError) {
			error(400, err.message);
		}
		console.error('BLAST execution error:', err);
		error(500, 'Internal server error while running BLAST');
	}
};
