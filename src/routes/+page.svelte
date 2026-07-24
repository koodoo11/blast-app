<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import BlastResultView from '$lib/components/BlastResultView.svelte';
	import type { BlastRunResponse } from '$lib/blast/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const EXAMPLE_FASTA = `>example_TP53_fragment
MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDIEQWFTEDPGPDEAPRMPEAA
PPVAPAPAAPTPAAPAPAPSWPLSSSVPSQKTYQGSYGFRLGFLHSGTAKSVTCTYSPALNKMFCQLAKT`;

	let sequence = $state('');
	let program = $state<'' | 'blastp' | 'blastx'>('');
	let loading = $state(false);
	let errorMessage = $state<string | null>(null);
	let response = $state<BlastRunResponse | null>(null);

	function loadExample() {
		sequence = EXAMPLE_FASTA;
		errorMessage = null;
		response = null;
	}

	async function runSearch() {
		if (!sequence.trim() || loading) return;

		loading = true;
		errorMessage = null;
		response = null;

		try {
			const res = await fetch('/api/blast', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sequence, ...(program ? { program } : {}) })
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.message ?? 'BLAST 요청이 실패했습니다.');
			}
			response = data as BlastRunResponse;
			await invalidateAll();
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleString();
	}
</script>

<div class="mx-auto max-w-4xl space-y-6 p-6">
	<div>
		<h1 class="text-3xl font-bold">BLAST 검색</h1>
		<p class="mt-1 text-sm text-gray-600">FASTA 서열을 입력하고 로컬 BLAST 데이터베이스를 검색합니다.</p>
	</div>

	<div class="space-y-3">
		<label class="block">
			<span class="text-sm font-medium text-gray-700">FASTA 서열</span>
			<textarea
				bind:value={sequence}
				rows="8"
				placeholder={'>my_sequence\nMEEPQSDPSV...'}
				class="mt-1 block w-full rounded-md border border-gray-300 p-3 font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
			></textarea>
		</label>

		<div class="flex flex-wrap items-center gap-3">
			<label class="flex items-center gap-2 text-sm">
				<span class="font-medium text-gray-700">프로그램</span>
				<select
					bind:value={program}
					class="rounded-md border border-gray-300 py-1.5 pl-2 pr-8 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
				>
					<option value="">자동 감지</option>
					<option value="blastp">blastp (단백질 서열)</option>
					<option value="blastx">blastx (뉴클레오타이드 서열)</option>
				</select>
			</label>

			<button
				type="button"
				onclick={loadExample}
				class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
			>
				예시 불러오기
			</button>

			<button
				type="button"
				onclick={runSearch}
				disabled={loading || !sequence.trim()}
				class="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{loading ? '검색 중...' : '검색'}
			</button>
		</div>

		{#if errorMessage}
			<div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
				{errorMessage}
			</div>
		{/if}
	</div>

	{#if response}
		<div>
			<p class="text-xs text-gray-500">
				Job ID: <a class="font-mono text-blue-600 underline" href="/job/{response.jobId}"
					>{response.jobId}</a
				>
			</p>
			<div class="mt-2">
				<BlastResultView result={response} />
			</div>
		</div>
	{/if}

	<div>
		<h2 class="text-lg font-semibold">최근 실행 기록</h2>
		{#if data.recentJobs.length === 0}
			<p class="mt-2 text-sm text-gray-600">아직 실행한 BLAST 작업이 없습니다.</p>
		{:else}
			<ul class="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200">
				{#each data.recentJobs as job (job.id)}
					<li class="flex items-center justify-between gap-4 p-3 text-sm">
						<div class="min-w-0">
							<a class="font-mono text-blue-600 underline" href="/job/{job.id}">{job.id}</a>
							<div class="truncate text-xs text-gray-500">{job.sequencePreview}...</div>
						</div>
						<div class="shrink-0 text-right text-xs text-gray-500">
							<div>{job.program} · 히트 {job.hitCount}개</div>
							<div>{formatDate(job.createdAt)}</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
