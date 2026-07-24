<script lang="ts">
	import type { BlastResult } from '$lib/blast/types';

	let { result }: { result: BlastResult } = $props();

	// Older stored jobs may predate the queryLength field; fall back to the
	// furthest hit coordinate so the bars still scale sensibly.
	let queryLength = $derived(
		result.queryLength || Math.max(1, ...result.hits.map((h) => h.queryEnd))
	);

	function colorForBitScore(bitScore: number): string {
		if (bitScore >= 200) return '#dc2626';
		if (bitScore >= 80) return '#c026d3';
		if (bitScore >= 50) return '#16a34a';
		if (bitScore >= 40) return '#2563eb';
		return '#374151';
	}

	function leftPercent(pos: number): number {
		return ((pos - 1) / queryLength) * 100;
	}

	function widthPercent(start: number, end: number): number {
		return Math.max(((end - start + 1) / queryLength) * 100, 0.5);
	}

	const legend = [
		{ label: '≥ 200', color: '#dc2626' },
		{ label: '80–199', color: '#c026d3' },
		{ label: '50–79', color: '#16a34a' },
		{ label: '40–49', color: '#2563eb' },
		{ label: '< 40', color: '#374151' }
	];
</script>

{#if result.hits.length > 0}
	<div class="space-y-2">
		<div class="flex items-center justify-between text-xs text-gray-500">
			<span>Query: 1</span>
			<span>Bit score</span>
			<span>{queryLength}</span>
		</div>

		<div class="relative h-2 rounded bg-gray-100">
			<div class="absolute inset-y-0 left-0 w-px bg-gray-300"></div>
			<div class="absolute inset-y-0 right-0 w-px bg-gray-300"></div>
		</div>

		<div class="space-y-1.5">
			{#each result.hits as hit (hit.accession + hit.queryStart)}
				<div class="flex items-center gap-2">
					<span class="w-32 shrink-0 truncate font-mono text-xs text-gray-600" title={hit.description}>
						{hit.accession}
					</span>
					<div class="relative h-3 flex-1 rounded bg-gray-100">
						<div
							class="absolute inset-y-0 rounded"
							style="left: {leftPercent(hit.queryStart)}%; width: {widthPercent(
								hit.queryStart,
								hit.queryEnd
							)}%; background-color: {colorForBitScore(hit.bitScore)};"
							title="{hit.accession}: query {hit.queryStart}-{hit.queryEnd}, bit score {hit.bitScore.toFixed(
								1
							)}, e-value {hit.evalue.toExponential(2)}"
						></div>
					</div>
				</div>
			{/each}
		</div>

		<div class="flex flex-wrap items-center gap-3 pt-1 text-xs text-gray-500">
			<span class="font-medium text-gray-600">Bit score:</span>
			{#each legend as item (item.label)}
				<span class="flex items-center gap-1">
					<span class="inline-block h-2 w-4 rounded" style="background-color: {item.color};"></span>
					{item.label}
				</span>
			{/each}
		</div>
	</div>
{/if}
