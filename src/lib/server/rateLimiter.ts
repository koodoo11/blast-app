interface Bucket {
	count: number;
	resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Fixed-window rate limiter. Opportunistically prunes expired buckets so the
 * map doesn't grow unbounded under many distinct keys (e.g. client IPs).
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
	const now = Date.now();

	if (buckets.size > 10_000) {
		for (const [k, b] of buckets) {
			if (b.resetAt <= now) buckets.delete(k);
		}
	}

	let bucket = buckets.get(key);
	if (!bucket || bucket.resetAt <= now) {
		bucket = { count: 0, resetAt: now + windowMs };
		buckets.set(key, bucket);
	}

	bucket.count += 1;
	return bucket.count <= limit;
}
