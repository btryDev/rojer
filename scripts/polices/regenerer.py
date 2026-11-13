"""Régénère les polices hébergées (src/polices/, dont src/polices/polices.css).

    python3 -I scripts/polices/regenerer.py

Reprend, pour chaque famille, la feuille que Google Fonts sert à un
navigateur récent (tous les sous-ensembles, chacun avec son unicode-range),
télécharge chaque fichier WOFF2 dans src/polices/ et réécrit les URL en
chemins relatifs. Hors de src/app : chaque dossier y serait une route. Le build ne télécharge plus rien (2026-11-13).
"""
import re
import subprocess
from pathlib import Path

RACINE = Path(__file__).resolve().parents[2]
DOSSIER = RACINE / "src/polices"
FEUILLE = DOSSIER / "polices.css"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
# (requête css2, préfixe des fichiers, variable CSS) — mêmes axes que l'ancien
# next/font/google.
FAMILLES = [
    ("IBM+Plex+Sans:wght@400;500;600;700", "ibm-plex-sans", "--font-body"),
    ("Instrument+Sans:wght@400..700", "instrument-sans", "--font-titre"),
    ("JetBrains+Mono:wght@100..800", "jetbrains-mono", "--font-mono"),
    ("Instrument+Serif:ital,wght@0,400;1,400", "instrument-serif", "--font-serif"),
]


def lire(url: str) -> bytes:
    # curl plutôt qu'urllib : il lit les certificats du système.
    return subprocess.run(
        ["curl", "-sf", "--max-time", "30", "-A", UA, url],
        check=True, capture_output=True,
    ).stdout


blocs, variables = [], []
for requete, prefixe, variable in FAMILLES:
    css = lire(f"https://fonts.googleapis.com/css2?family={requete}&display=swap").decode()
    nom = None
    for m in re.finditer(r"/\* ([\w-]+) \*/\s*@font-face \{(.*?)\}", css, re.S):
        sous_ensemble, corps = m.group(1), m.group(2)
        nom = re.search(r"font-family: '([^']+)'", corps).group(1)
        style = re.search(r"font-style: (\w+)", corps).group(1)
        url = re.search(r"url\((\S+?)\)", corps).group(1)
        fichier = f"{prefixe}-{sous_ensemble}{'-italic' if style == 'italic' else ''}.woff2"
        if not (DOSSIER / fichier).exists():
            (DOSSIER / fichier).write_bytes(lire(url))
        corps = corps.replace(url, f"./{fichier}")
        blocs.append(f"/* {nom} — {sous_ensemble} */\n@font-face {{{corps}}}")
    variables.append(f'  {variable}: "{nom}";')

FEUILLE.write_text(
    "/* GÉNÉRÉ par scripts/polices/regenerer.py — ne pas éditer à la main.\n"
    " * Les feuilles de Google Fonts (css2, tous sous-ensembles), fichiers\n"
    " * hébergés à côté ; licences : LICENCES.md. */\n\n"
    + "\n\n".join(blocs)
    + "\n\n/* Posée sur <html> par la mise en page racine et global-error.tsx. */\n.polices {\n"
    + "\n".join(variables)
    + "\n}\n"
)
print(len(blocs), "faces,", len(list(DOSSIER.glob("*.woff2"))), "fichiers")
