#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

IN_FASTA="$ROOT_DIR/data/sequences.fasta"
OUT_DIR="$ROOT_DIR/data/blastdb"
OUT_NAME="sequences"

if ! command -v makeblastdb >/dev/null 2>&1; then
	echo "makeblastdb not found. Install ncbi-blast+ (see Dockerfile) or run this inside the app container." >&2
	exit 1
fi

mkdir -p "$OUT_DIR"

makeblastdb \
	-in "$IN_FASTA" \
	-dbtype prot \
	-title "$OUT_NAME" \
	-out "$OUT_DIR/$OUT_NAME" \
	-parse_seqids

echo "BLAST protein database built at $OUT_DIR/$OUT_NAME"
