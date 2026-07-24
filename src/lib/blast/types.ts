export const MAX_SEQUENCE_LENGTH = 50_000;
export const BLAST_PROGRAMS = ['blastp', 'blastx'] as const;
export type BlastProgram = (typeof BLAST_PROGRAMS)[number];

export interface BlastHit {
	id: string;
	accession: string;
	description: string;
	identity: number;
	alignmentLength: number;
	mismatches: number;
	gapOpens: number;
	queryStart: number;
	queryEnd: number;
	hitStart: number;
	hitEnd: number;
	evalue: number;
	bitScore: number;
	querySeq: string;
	hitSeq: string;
	midline: string;
}

export interface BlastResult {
	program: BlastProgram;
	queryLength: number;
	hits: BlastHit[];
}

export interface BlastRunResponse extends BlastResult {
	jobId: string;
}

export interface BlastJob {
	id: string;
	sequence: string;
	program: BlastProgram;
	result: BlastResult;
	createdAt: string;
}

export interface BlastJobSummary {
	id: string;
	program: BlastProgram;
	sequencePreview: string;
	hitCount: number;
	createdAt: string;
}
