import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { checkRateLimit } from '$lib/server/rateLimiter';

const BLAST_RATE_LIMIT = 10;
const BLAST_RATE_WINDOW_MS = 60_000;

const handleSecurity: Handle = async ({ event, resolve }) => {
	if (event.request.method === 'POST' && event.url.pathname === '/api/blast') {
		const ip = event.getClientAddress();
		const allowed = checkRateLimit(`blast:${ip}`, BLAST_RATE_LIMIT, BLAST_RATE_WINDOW_MS);
		if (!allowed) {
			return new Response(JSON.stringify({ message: 'Too many requests. Please try again later.' }), {
				status: 429,
				headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
			});
		}
	}

	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'no-referrer');
	return response;
};

const handleParaglide: Handle = ({ event, resolve }) => paraglideMiddleware(event.request, ({ request, locale }) => {
	event.request = request;

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale).replace('%paraglide.dir%', getTextDirection(locale))
	});
});

export const handle: Handle = sequence(handleSecurity, handleParaglide);
