#!/bin/sh
# Télécharge chaque PDF (et le ZIP de contrôle) de quelques dossiers du banc,
# pour comparer deux versions de l'application sur des données réelles : le
# texte de chaque PDF (pdftotext), pas ses octets (date de création,
# identifiants internes).
#
#   sh scripts/charge/telecharger-pdf.sh <dossier-de-sortie> "6 70 51"
#   puis : sh scripts/charge/telecharger-pdf.sh --comparer <avant> <après>
set -eu
cd "$(dirname "$0")/../.."

if [ "${1:-}" = "--comparer" ]; then
  avant="${2:?dossier avant}"; apres="${3:?dossier après}"; ecarts=0
  for f in "$avant"/*.pdf; do
    nom=$(basename "$f")
    if [ ! -s "$apres/$nom" ]; then echo "ABSENT après : $nom"; ecarts=$((ecarts + 1)); continue; fi
    # La date de génération imprimée dans le document change d'un rendu à l'autre.
    pdftotext -layout "$f" - | grep -v -E "[0-9]{2}/[0-9]{2}/[0-9]{4} (à )?[0-9]{2}[:h][0-9]{2}" > "$f.txt"
    pdftotext -layout "$apres/$nom" - | grep -v -E "[0-9]{2}/[0-9]{2}/[0-9]{4} (à )?[0-9]{2}[:h][0-9]{2}" > "$apres/$nom.txt"
    pa=$(pdfinfo "$f" | awk '/^Pages/ {print $2}'); pb=$(pdfinfo "$apres/$nom" | awk '/^Pages/ {print $2}')
    if cmp -s "$f.txt" "$apres/$nom.txt" && [ "$pa" = "$pb" ]; then
      echo "identique : $nom ($pa pages)"
    else
      echo "DIFFÉRENT : $nom (pages $pa → $pb) ; diff -u $f.txt $apres/$nom.txt"; ecarts=$((ecarts + 1))
    fi
  done
  echo "$ecarts écart(s)"
  exit 0
fi

sortie="${1:?dossier de sortie}"; dossiers="${2:?numéros de dossier}"
mkdir -p "$sortie"
champ() { python3 -I -c "import json,sys;print([d for d in json.load(open('.charge/sessions.json')) if d['n']==int(sys.argv[1])][0][sys.argv[2]])" "$1" "$2"; }
for n in $dossiers; do
  k=$(champ "$n" cookie); e=$(champ "$n" etablissementId); d=$(champ "$n" duerpId); q=$(champ "$n" equipementId)
  for spec in \
    "registre:/api/etablissements/$e/registre/pdf" \
    "dossier:/api/etablissements/$e/dossier-conformite/pdf" \
    "plan:/api/etablissements/$e/plan-actions/pdf" \
    "points:/api/etablissements/$e/equipements/$q/points-a-corriger/pdf" \
    "duerp:/duerp/$d/pdf/preview" \
    "zip:/api/etablissements/$e/controle-zip"; do
    type=${spec%%:*}; chemin=${spec#*:}
    ext=pdf; [ "$type" = zip ] && ext=zip
    code=$(curl -s -o "$sortie/d$n-$type.$ext" -m 180 -w '%{http_code}' -H "cookie: $k" "http://localhost:8080$chemin")
    echo "d$n $type : $code $(wc -c < "$sortie/d$n-$type.$ext" | tr -d ' ') o"
  done
  # Les PDF du ZIP, à comparer aussi.
  if [ -s "$sortie/d$n-zip.zip" ]; then
    rm -rf "$sortie/d$n-zip"; mkdir -p "$sortie/d$n-zip"; unzip -q -o "$sortie/d$n-zip.zip" -d "$sortie/d$n-zip" || true
    for p in "$sortie/d$n-zip"/*.pdf; do [ -f "$p" ] && cp "$p" "$sortie/d$n-zip-$(basename "$p")"; done
  fi
done
