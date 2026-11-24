"""Dessine le logo « Rojer » en SVG, depuis IBM Plex Sans embarquée.

Règles fixées par la propriétaire le 2026-11-24, d'après son image de
référence :
- IBM Plex Sans, graisse 600 ;
- interlettrage de -0,06 em, mesuré sur l'image (épaisseur du fût rapportée à
  la capitale : 0,19 ; largeur du mot : 3,0 fois la capitale) ;
- point du j rond. Plex le dessine carré et n'a pas de variante, donc on
  retire ce contour du j et on pose un cercle au même centre (rayon : 1,08
  fois sa demi-largeur, un rond paraissant plus petit qu'un carré).

Sortie : le `d` d'un seul chemin, et sa viewBox, à recopier dans
`src/components/marque/LogoRojer.tsx`. À relancer seulement si les règles
changent :

    python3 -m venv /tmp/venv-logo && /tmp/venv-logo/bin/pip install fonttools brotli
    /tmp/venv-logo/bin/python scripts/marque/logo-rojer.py
"""

from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

POLICE = Path(__file__).resolve().parents[2] / "src/polices/ibm-plex-sans-latin.woff2"
GRAISSE = 600
INTERLETTRAGE = -0.06  # em
FACTEUR_ROND = 1.08
MOT = "Rojer"


def contours(enregistrement):
    """Découpe les opérations d'un glyphe en contours fermés."""
    courant, tous = [], []
    for op, args in enregistrement.value:
        courant.append((op, args))
        if op in ("closePath", "endPath"):
            tous.append(courant)
            courant = []
    return tous


def bornes(ops, glyphes):
    pen = BoundsPen(glyphes)
    rejouer(ops, pen)
    return pen.bounds


def rejouer(ops, pen):
    for op, args in ops:
        getattr(pen, op)(*args)


police = instantiateVariableFont(TTFont(POLICE), {"wght": GRAISSE})
glyphes = police.getGlyphSet()
cmap = police.getBestCmap()
upm = police["head"].unitsPerEm
hauteur_x = police["OS/2"].sxHeight

pen_svg = SVGPathPen(glyphes, ntos=lambda v: str(round(v)))  # 1 unité = 1/1000 em : l'entier suffit
x = 0.0
cercle = None
for i, lettre in enumerate(MOT):
    nom = cmap[ord(lettre)]
    enr = RecordingPen()
    glyphes[nom].draw(enr)
    for ops in contours(enr):
        x_min, y_min, x_max, y_max = bornes(ops, glyphes)
        if lettre == "j" and y_min > hauteur_x:
            # Le point carré : remplacé par un rond de même centre.
            cercle = (x + (x_min + x_max) / 2, (y_min + y_max) / 2, (x_max - x_min) / 2 * FACTEUR_ROND)
            continue
        # SVG : l'axe des y descend ; la ligne de base est à y = 0.
        rejouer(ops, TransformPen(pen_svg, (1, 0, 0, -1, x, 0)))
    x += glyphes[nom].width + (INTERLETTRAGE * upm if i < len(MOT) - 1 else 0)

if cercle is None:
    raise SystemExit(f"Point du j introuvable dans « {MOT} » : aucun contour du j au-dessus de la hauteur d'x.")
cx, cy, r = cercle
r = round(r)  # arrondi une fois : le diamètre de l'arc vaut exactement 2 r
x0_rond, y_rond = round(cx - r), round(-cy)
d = pen_svg.getCommands()
d += f"M{x0_rond} {y_rond}a{r} {r} 0 1 0 {2 * r} 0a{r} {r} 0 1 0 {-2 * r} 0Z"

# viewBox serrée sur l'encre : du haut du point au bas du jambage du j.
tout = BoundsPen(glyphes)
x = 0.0
for i, lettre in enumerate(MOT):
    nom = cmap[ord(lettre)]
    glyphes[nom].draw(TransformPen(tout, (1, 0, 0, -1, x, 0)))
    x += glyphes[nom].width + (INTERLETTRAGE * upm if i < len(MOT) - 1 else 0)
x0, y0, x1, y1 = tout.bounds
y0 = min(y0, -cy - r)
print(f'viewBox="{x0:.0f} {y0:.0f} {x1 - x0:.0f} {y1 - y0:.0f}"')
print(f"d ({len(d)} caractères) :")
print(d)
