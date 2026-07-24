<script lang="ts">
	import type { BlastHit, BlastResult } from '$lib/blast/types';
	import AlignmentViewer from '$lib/components/AlignmentViewer.svelte';

	let { result }: { result: BlastResult } = $props();

	let activeTab = $state<'summary' | 'alignments'>('summary');

	function formatPercent(x: number): string {
		return `${(x * 100).toFixed(1)}%`;
	}

	function formatEvalue(x: number): string {
		return x.toExponential(2);
	}

	interface AlignmentChunk {
		q: string;
		m: string;
		h: string;
		qStart: number;
		qEnd: number;
		hStart: number;
		hEnd: number;
	}

	function chunkAlignment(hit: BlastHit, width = 60): AlignmentChunk[] {
		const chunks: AlignmentChunk[] = [];
		let qPos = hit.queryStart;
		let hPos = hit.hitStart;

		for (let i = 0; i < hit.querySeq.length; i += width) {
			const q = hit.querySeq.slice(i, i + width);
			const m = hit.midline.slice(i, i + width);
			const h = hit.hitSeq.slice(i, i + width);
			const qGaps = (q.match(/-/g) ?? []).length;
			const hGaps = (h.match(/-/g) ?? []).length;
			const qEnd = qPos + q.length - qGaps - 1;
			const hEnd = hPos + h.length - hGaps - 1;
			chunks.push({ q, m, h, qStart: qPos, qEnd, hStart: hPos, hEnd });
			qPos = qEnd + 1;
			hPos = hEnd + 1;
		}

		return chunks;
	}

	const CSV_HEADERS = [
		'accession',
		'description',
		'identity',
		'alignment_length',
		'mismatches',
		'gap_opens',
		'query_start',
		'query_end',
		'hit_start',
		'hit_end',
		'evalue',
		'bit_score'
	];

	function csvEscape(value: string | number): string {
		const str = String(value);
		return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
	}

	function hitsToCsv(hits: BlastHit[]): string {
		const rows = hits.map((hit) =>
			[
				hit.accession,
				hit.description,
				hit.identity,
				hit.alignmentLength,
				hit.mismatches,
				hit.gapOpens,
				hit.queryStart,
				hit.queryEnd,
				hit.hitStart,
				hit.hitEnd,
				hit.evalue,
				hit.bitScore
			]
				.map(csvEscape)
				.join(',')
		);
		return [CSV_HEADERS.join(','), ...rows].join('\n');
	}

	function downloadCsv() {
		const csv = hitsToCsv(result.hits);
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		link.href = url;
		link.download = `blast_${result.program}_${timestamp}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	}
</script>

<div>
	<div class="flex gap-1 border-b border-gray-200">
		<button
			type="button"
			onclick={() => (activeTab = 'summary')}
			class="border-b-2 px-4 py-2 text-sm font-medium {activeTab === 'summary'
				? 'border-blue-600 text-blue-600'
				: 'border-transparent text-gray-500 hover:text-gray-700'}"
		>
			Summary
		</button>
		<button
			type="button"
			onclick={() => (activeTab = 'alignments')}
			class="border-b-2 px-4 py-2 text-sm font-medium {activeTab === 'alignments'
				? 'border-blue-600 text-blue-600'
				: 'border-transparent text-gray-500 hover:text-gray-700'}"
		>
			Alignments
		</button>
	</div>

	<div class="mt-2 flex items-center justify-between">
		<p class="text-xs text-gray-500">
			프로그램: {result.program} · 히트 {result.hits.length}개
		</p>
		{#if result.hits.length > 0}
			<button
				type="button"
				onclick={downloadCsv}
				class="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
			>
				CSV 다운로드
			</button>
		{/if}
	</div>

	<div class="mt-3">
		<AlignmentViewer {result} />
	</div>

	{#if result.hits.length === 0}
		<p class="mt-4 text-sm text-gray-600">일치하는 서열이 없습니다.</p>
	{:else if activeTab === 'summary'}
		<div class="mt-4 overflow-x-auto">
			<table class="w-full text-left text-sm">
				<thead>
					<tr class="border-b border-gray-200 text-gray-500">
						<th class="py-2 pr-4 font-medium">Accession</th>
						<th class="py-2 pr-4 font-medium">Description</th>
						<th class="py-2 pr-4 font-medium">Identity</th>
						<th class="py-2 pr-4 font-medium">Align len</th>
						<th class="py-2 pr-4 font-medium">E-value</th>
						<th class="py-2 pr-4 font-medium">Bit score</th>
					</tr>
				</thead>
				<tbody>
					{#each result.hits as hit (hit.accession + hit.queryStart)}
						<tr class="border-b border-gray-100">
							<td class="py-2 pr-4 font-mono">{hit.accession}</td>
							<td class="py-2 pr-4">{hit.description}</td>
							<td class="py-2 pr-4">{formatPercent(hit.identity)}</td>
							<td class="py-2 pr-4">{hit.alignmentLength}</td>
							<td class="py-2 pr-4">{formatEvalue(hit.evalue)}</td>
							<td class="py-2 pr-4">{hit.bitScore.toFixed(1)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="mt-4 space-y-6">
			{#each result.hits as hit (hit.accession + hit.queryStart)}
				<div class="rounded-md border border-gray-200 p-4">
					<div class="mb-2 text-sm">
						<span class="font-mono font-medium">{hit.accession}</span>
						<span class="text-gray-600">{hit.description}</span>
					</div>
					<div class="mb-3 text-xs text-gray-500">
						Identity: {formatPercent(hit.identity)} · E-value: {formatEvalue(hit.evalue)} · Bit score:
						{hit.bitScore.toFixed(1)}
					</div>
					<div class="space-y-3 overflow-x-auto font-mono text-xs leading-tight">
						{#each chunkAlignment(hit) as chunk}
							<div>
								<div>Query {chunk.qStart}&nbsp;&nbsp;{chunk.q}&nbsp;&nbsp;{chunk.qEnd}</div>
								<div class="pl-[9ch] text-gray-500">{chunk.m}</div>
								<div>Sbjct {chunk.hStart}&nbsp;&nbsp;{chunk.h}&nbsp;&nbsp;{chunk.hEnd}</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
