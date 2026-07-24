<script lang="ts">
	import BlastResultView from '$lib/components/BlastResultView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleString();
	}
</script>

<div class="mx-auto max-w-4xl space-y-6 p-6">
	<div>
		<a href="/" class="text-sm text-blue-600 underline">← 검색으로 돌아가기</a>
		<h1 class="mt-2 text-2xl font-bold">BLAST 작업 결과</h1>
		<dl class="mt-2 space-y-1 text-sm text-gray-600">
			<div><dt class="inline font-medium text-gray-700">Job ID:</dt> <dd class="inline font-mono">{data.job.id}</dd></div>
			<div><dt class="inline font-medium text-gray-700">프로그램:</dt> <dd class="inline">{data.job.program}</dd></div>
			<div><dt class="inline font-medium text-gray-700">실행 시각:</dt> <dd class="inline">{formatDate(data.job.createdAt)}</dd></div>
		</dl>
	</div>

	<div>
		<span class="text-sm font-medium text-gray-700">입력 서열</span>
		<pre class="mt-1 overflow-x-auto rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-xs">{data.job.sequence}</pre>
	</div>

	<BlastResultView result={data.job.result} />
</div>
