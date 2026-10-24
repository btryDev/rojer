#!/usr/bin/env bash
# La mesure de lecture unique (2026-10-24, décision de la propriétaire) :
# remplace les bornes de paragraphe recopiées à la main (62 à 72 caractères)
# par le jeton `--board-mesure` (globals.css). Les bornes plus étroites
# (titres, étiquettes) ne sont pas touchées. Idempotent : à relancer après
# un merge qui ramènerait d'anciennes bornes.
set -euo pipefail
cd "$(dirname "$0")/.."
grep -rlE 'max-w-\[(62|64|66|68|70|72)ch\]' src \
  | while IFS= read -r f; do
      perl -pi -e 's/max-w-\[(62|64|66|68|70|72)ch\]/max-w-[var(--board-mesure)]/g' "$f"
    done
grep -rcE 'max-w-\[var\(--board-mesure\)\]' src | awk -F: '{n+=$2} END {print n " paragraphes sur la mesure"}'
