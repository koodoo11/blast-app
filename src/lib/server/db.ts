import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { env } from '$env/dynamic/private';
import type { BlastJob, BlastJobSummary, BlastProgram, BlastResult } from '$lib/blast/types';

function resolveDbPath(): string {
	const url = env.DATABASE_URL;
	if (!url) {
		return join(process.cwd(), 'data', 'db.sqlite');
	}
	return url.startsWith('file:') ? url.slice('file:'.length) : url;
}

let db: DatabaseSync | undefined;

function getDb(): DatabaseSync {
	if (db) return db;

	const dbPath = resolveDbPath();
	mkdirSync(dirname(dbPath), { recursive: true });

	db = new DatabaseSync(dbPath);
	db.exec(`
		CREATE TABLE IF NOT EXISTS jobs (
			id TEXT PRIMARY KEY,
			sequence TEXT NOT NULL,
			program TEXT NOT NULL,
			result TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
		)
	`);
	db.exec('CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs (created_at DESC)');

	return db;
}

export function insertJob(job: { id: string; sequence: string; program: BlastProgram; result: BlastResult }): void {
	getDb()
		.prepare('INSERT INTO jobs (id, sequence, program, result) VALUES (?, ?, ?, ?)')
		.run(job.id, job.sequence, job.program, JSON.stringify(job.result));
}

export function getJob(id: string): BlastJob | null {
	const row = getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(id) as
		| { id: string; sequence: string; program: string; result: string; created_at: string }
		| undefined;

	if (!row) return null;

	return {
		id: row.id,
		sequence: row.sequence,
		program: row.program as BlastProgram,
		result: JSON.parse(row.result) as BlastResult,
		createdAt: row.created_at
	};
}

export function listRecentJobs(limit = 20): BlastJobSummary[] {
	const rows = getDb()
		.prepare(
			`SELECT id, program, created_at, sequence, result
			 FROM jobs ORDER BY created_at DESC LIMIT ?`
		)
		.all(limit) as { id: string; program: string; created_at: string; sequence: string; result: string }[];

	return rows.map((row) => {
		const result = JSON.parse(row.result) as BlastResult;
		return {
			id: row.id,
			program: row.program as BlastProgram,
			sequencePreview: row.sequence.replace(/\s+/g, '').slice(0, 60),
			hitCount: result.hits.length,
			createdAt: row.created_at
		};
	});
}
