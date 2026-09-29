#!/usr/bin/env bash
# Usage : bash ocr-par-tour.sh <n> <sortie.tsv>   (apres chaque tour n)
#
# Isole les CV du tour AVANT de les analyser, pour que l OCR et le tour suivant
# de Chrome ne se disputent plus le dossier Downloads : l un lit son propre
# dossier, l autre ecrit dans Downloads. Les deux peuvent tourner en meme temps.
#
# emails-depuis-cv.sh lit "$HOME/Downloads" en dur : on lui fabrique donc un HOME
# a lui, dont le Downloads ne contient que les CV de ce tour.
#
# Le marqueur « === TOUR n === » sert a assembler.js : Chrome renumerote a partir
# de Document.pdf a chaque tour, les rangs repartent donc de 0.
set -u
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
DL="$HOME/Downloads"
TOUR="$1"
SORTIE="$2"
BASE="$DL/_cv-lot100/tour-$TOUR"
# Seulement les CV des 4 dernieres heures : un vieux Document.pdf personnel reste en place.
n=$(find "$DL" -maxdepth 1 -name 'Document*.pdf' -mmin -240 | wc -l)
if [ "$n" -eq 0 ]; then echo "TOUR $TOUR : aucun CV neuf" >&2; exit 0; fi
mkdir -p "$BASE/Downloads"
find "$DL" -maxdepth 1 -name 'Document*.pdf' -mmin -240 -exec mv {} "$BASE/Downloads"/ \;
echo "=== TOUR $TOUR ===" >> "$SORTIE"
HOME="$BASE" bash "$SKILL/scripts/emails-depuis-cv.sh" 600 "$SORTIE" >/dev/null 2>>"$SORTIE.err"
echo "TOUR $TOUR : $n CV isoles et analyses" >&2
