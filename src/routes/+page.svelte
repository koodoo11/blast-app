<script lang="ts">
	import type { BlastHit, BlastResult } from '$lib/blast/types';

	const EXAMPLE_FASTA = `>example_TP53_fragment
MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDIEQWFTEDPGPDEAPRMPEAA
PPVAPAPAAPTPAAPAPAPSWPLSSSVPSQKTYQGSYGFRLGFLHSGTAKSVTCTYSPALNKMFCQLAKT`;

	let sequence = $state('');
	let program = $state<'' | 'blastp' | 'blastx'>('');
	let loading = $state(false);
	let errorMessage = $state<string | null>(null);
	let result = $state<BlastResult | null>(null);
	let activeTab = $state<'summary' | 'alignments'>('summary');

	function loadExample() {
		sequence = EXAMPLE_FASTA;
		errorMessage = null;
		result = null;
	}

	async function runSearch() {
		if (!sequence.trim() || loading) return;

		loading = true;
		errorMessage = null;
		result = null;

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
			result = data as BlastResult;
			activeTab = 'summary';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

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

	{#if result}
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

			<p class="mt-2 text-xs text-gray-500">
				프로그램: {result.program} · 히트 {result.hits.length}개
			</p>

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
	{/if}
</div>
