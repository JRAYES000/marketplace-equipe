#!/usr/bin/env bash
# Usage : bash ocr-par-tour.sh 0 <sortie.tsv>   (au debut du lot, avant le premier CV)
#         bash ocr-par-tour.sh <n> <sortie.tsv>   (apres chaque tour n = 1, 2, ...)
#
# Isole les CV du tour AVANT de les analyser, pour que l OCR et le tour suivant
# de Chrome ne se disputent plus le dossier Downloads : l un lit son propre
# dossier, l autre ecrit dans Downloads. Les deux peuvent tourner en meme temps.
#
# emails-depuis-cv.sh lit "$HOME/Downloads" : on lui fabrique donc un HOME
# a lui, dont le Downloads ne contient que les CV de ce tour.
#
# Le marqueur « === TOUR n === » sert a assembler.js : Chrome renumerote a partir
# de Document.pdf a chaque tour, les rangs repartent donc de 0.
#
# v9.1 : attend la fin des telechargements en cours (un CV encore en .crdownload
# arrivait apres le deplacement, tombait dans le tour suivant et decalait l ordre) ;
# a partir du 2e tour, ne prend que les CV plus recents que le tour precedent
# (marqueur), et plus tout Document*.pdf des 4 dernieres heures ; accepte Telechargements.
set -u
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
if   [ -d "$HOME/Downloads" ];       then DL="$HOME/Downloads"
elif [ -d "$HOME/Téléchargements" ]; then DL="$HOME/Téléchargements"
else echo "ERREUR : dossier Downloads introuvable sous $HOME" >&2; exit 1
fi
TOUR="$1"
SORTIE="$2"
LOT="$DL/_cv-lot100"
BASE="$LOT/tour-$TOUR"
MARQUE="$LOT/.fin-dernier-tour"

# Tour 0 = debut du lot, avant le premier CV : pose le marqueur. Les tours suivants ne prennent
# alors que les CV arrives depuis ; un Document.pdf personnel plus ancien ne bouge plus.
if [ "$TOUR" = "0" ]; then
  mkdir -p "$LOT"; touch "$MARQUE"; rm -f "$LOT/.prec"
  echo "lot demarre : seuls les CV telecharges a partir de maintenant seront pris" >&2; exit 0
fi

# Telechargements en cours : 20 s au plus, puis on continue en le signalant.
for _ in $(seq 1 20); do
  ls "$DL"/*.crdownload >/dev/null 2>&1 || break
  sleep 1
done
ls "$DL"/*.crdownload >/dev/null 2>&1 && echo "TOUR $TOUR : un telechargement est encore en cours, il partira au tour suivant (appariement a surveiller)" >&2

# Le marqueur est pose AVANT la recherche : un CV fini entre les deux est pris maintenant,
# jamais perdu entre deux tours.
mkdir -p "$LOT"
if [ -f "$MARQUE" ]; then mv "$MARQUE" "$LOT/.prec"; NOUVEAUX=(-newer "$LOT/.prec")
else NOUVEAUX=(-mmin -240); echo "TOUR $TOUR : pas de tour 0, repli sur les CV des 4 dernieres heures (un PDF personnel recent serait pris)" >&2
fi
touch "$MARQUE"
mapfile -t cvs < <(find "$DL" -maxdepth 1 -name 'Document*.pdf' "${NOUVEAUX[@]}")
if [ "${#cvs[@]}" -eq 0 ]; then echo "TOUR $TOUR : aucun CV neuf" >&2; exit 0; fi
mkdir -p "$BASE/Downloads"
mv "${cvs[@]}" "$BASE/Downloads"/
echo "=== TOUR $TOUR ===" >> "$SORTIE"
HOME="$BASE" bash "$SKILL/scripts/emails-depuis-cv.sh" 600 "$SORTIE" >/dev/null 2>>"$SORTIE.err"
echo "TOUR $TOUR : ${#cvs[@]} CV isoles et analyses" >&2
