#!/usr/bin/env bash
# Isole les CV du tour AVANT de les analyser, pour que l OCR et le tour suivant
# de Chrome ne se disputent plus le dossier Downloads : l un lit son propre
# dossier, l autre ecrit dans Downloads. Les deux peuvent tourner en meme temps.
#
# emails-depuis-cv.sh lit "$HOME/Downloads" en dur : on lui fabrique donc un HOME
# a lui, dont le Downloads ne contient que les CV de ce tour.
set -u
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
DL="$HOME/Downloads"
TOUR="$1"
SORTIE="$2"
BASE="$DL/_cv-lot100/tour-$TOUR"
n=$(ls "$DL"/Document*.pdf 2>/dev/null | wc -l)
if [ "$n" -eq 0 ]; then echo "TOUR $TOUR : aucun CV neuf" >&2; exit 0; fi
mkdir -p "$BASE/Downloads"
mv "$DL"/Document*.pdf "$BASE/Downloads"/ 2>/dev/null
echo "=== TOUR $TOUR ===" >> "$SORTIE"
HOME="$BASE" bash "$SKILL/scripts/emails-depuis-cv.sh" 600 >> "$SORTIE" 2>>"$SORTIE.err"
echo "TOUR $TOUR : $n CV isoles et analyses" >&2
