import { listRecentJobs } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { recentJobs: listRecentJobs(20) };
};
