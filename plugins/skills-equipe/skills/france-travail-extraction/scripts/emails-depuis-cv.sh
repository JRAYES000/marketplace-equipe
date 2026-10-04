#!/usr/bin/env bash
# Recupere les CV fraichement telecharges et en extrait email + telephone.
#
# Usage : bash scripts/emails-depuis-cv.sh [minutes] [sortie.tsv]
#         minutes    = age maximum des CV a prendre dans Downloads (defaut 60)
#         sortie.tsv = fichier ou AJOUTER les lignes completes, pour assembler.js.
#                      Un fichier neuf par lot.
#
# Sur stdout, une ligne courte par CV, dans l ORDRE REEL de telechargement :
#   <rang> <TAB> <fichier> <TAB> <email> <TAB> <telephone>
# Dans sortie.tsv, la meme ligne plus une 5e colonne : le texte du CV (page 1)
# sur une seule ligne. assembler.js y cherche le nom de chaque candidat.
# Les champs vides le sont pour de vrai. Aucune valeur n est inventee.
#
# Rang : Document.pdf = 0, Document (n).pdf = n, et les CV sortent tries sur ce
# rang. Jamais de `sort` sur les noms : il rend (1), (10), (2)… et Document.pdf
# en dernier, ce qui decalait l appariement (bug corrige en v8.0).
#
# Ce script remplace l ancien couple copier-cv.sh + ocr-lot.sh : une seule
# commande, parce que l agent n avait aucune raison de piloter les deux etapes
# separement et se trompait de dossier entre les deux.
#
# Chrome nomme TOUS les CV Document.pdf, puis Document (1).pdf, Document (2).pdf.
# Le nom affiche sur France Travail est cosmetique et n arrive jamais jusqu au
# fichier : on selectionne par date de telechargement, jamais par nom.
#
# Appariement CV -> candidat : assembler.js (SKILL.md, Phase 4).

set -u

MINUTES="${1:-60}"
SORTIE="${2:-}"
RE_EMAIL='[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
RE_TEL='(\+33|0)[ .]?[1-9]([ .]?[0-9]{2}){4}'

# Sous Windows, winget installe poppler et tesseract HORS du PATH : les outils
# sont bien la, mais introuvables depuis Git Bash. Constate le 2026-09-17 sur le
# laptop de Julien — winget repondait "deja installe" pendant que le script
# declarait la dependance manquante. On ajoute donc les emplacements connus
# avant de conclure a une absence.
for dossier in \
  "$LOCALAPPDATA/Microsoft/WinGet/Packages"/oschwartz10612.Poppler_*/poppler-*/Library/bin \
  "/c/Program Files/Tesseract-OCR" \
  "/c/Program Files/poppler/Library/bin"
do
  [ -d "$dossier" ] && PATH="$PATH:$dossier"
done
export PATH

for outil in pdftotext pdftoppm tesseract; do
  command -v "$outil" >/dev/null 2>&1 || {
    echo "ERREUR : $outil absent. Lancer installation/verifier-dependances.sh (depot ecole-naturo-ops, dossier prospection-france-travail)" >&2
    exit 1
  }
done

# Le pack francais ameliore l OCR des accents ; eng suffit pour un email.
if tesseract --list-langs 2>/dev/null | grep -qx "fra"; then LANGUE="fra+eng"; else LANGUE="eng"; fi

# Ordre : dossier impose (FT_SOURCE, pose par ocr-par-tour.sh), dossier du lot Playwright,
# puis Downloads, qui change de nom d un poste a l autre.
# v10.0 : les CV arrivent dans le dossier du lot que remplit l'ecouteur Playwright (playwright.js),
# plus dans Downloads. Downloads reste le repli quand ce dossier n'existe pas.
if [ -n "${LOCALAPPDATA:-}" ]; then FT="$(cygpath -u "$LOCALAPPDATA" 2>/dev/null || printf '%s' "$LOCALAPPDATA")/france-travail-extraction/telechargements"
else FT="$HOME/.local/state/france-travail-extraction/telechargements"
fi
if   [ -n "${FT_SOURCE:-}" ];         then SOURCE="$FT_SOURCE"
elif [ -d "$FT" ];                  then SOURCE="$FT"
elif [ -d "$HOME/Downloads" ];        then SOURCE="$HOME/Downloads"
elif [ -d "$HOME/Téléchargements" ];  then SOURCE="$HOME/Téléchargements"
else echo "ERREUR : dossier Downloads introuvable sous $HOME" >&2; exit 1
fi

TRAVAIL=$(mktemp -d)
trap 'rm -rf "$TRAVAIL"' EXIT

n=0
while IFS= read -r pdf; do
  [ -z "$pdf" ] && continue
  n=$((n + 1))
  base="$TRAVAIL/cv$n"
  cp "$pdf" "$base.pdf"

# Trois passes sur un fichier texte, de la plus sure a la plus reconstruite.
# Mesure le 2026-09-17 : les passes 2 et 3 recuperent 2 emails sur 9 que la
# passe 1 laissait tomber, sur des pages par ailleurs parfaitement lisibles.
# Elles s appliquent AUSSI a la couche texte : la coupure du domaine vient
# parfois du PDF lui-meme, pas de l OCR.
emails_du_fichier() {
  local f="$1" e

  # 1) tel quel
  e=$(grep -ioE "$RE_EMAIL" "$f" 2>/dev/null | head -1)
  [ -n "$e" ] && { printf '%s' "$e"; return; }

  # 2) coupure parasite dans le domaine : "YAHO O.COM", "YAHO\nO.COM".
  #    On aplatit les sauts de ligne, sinon sed ne voit jamais les deux moities.
  e=$(tr '\r\n' '  ' < "$f" | sed -E 's/@([A-Za-z0-9.-]+)[ ]+([A-Za-z0-9.-]*\.[A-Za-z]{2,})/@\1\2/g' \
      | grep -ioE "$RE_EMAIL" | head -1)
  [ -n "$e" ] && { printf '%s' "$e"; return; }

  # 3) arobase lue comme un e : mdurandegmail.com -> mdurand@gmail.com.
  #    Reconstruction PROBABLE, jamais certaine : marquee pour etre signalee.
  e=$(grep -ioE "[A-Za-z0-9._%+-]+e(gmail|yahoo|hotmail|outlook|orange|wanadoo|free|laposte|sfr|icloud)\.[A-Za-z]{2,}" "$f" 2>/dev/null \
      | head -1 | sed -E 's/e(gmail|yahoo|hotmail|outlook|orange|wanadoo|free|laposte|sfr|icloud)\./@\1./I')
  [ -n "$e" ] && printf '%s [RECONSTRUIT]' "$e"
}

  # 1) couche texte : instantane quand le CV en a une
  pdftotext "$base.pdf" "$base.couche" 2>/dev/null
  email=$([ -f "$base.couche" ] && emails_du_fichier "$base.couche")
  tel=$([ -f "$base.couche" ] && grep -oE "$RE_TEL" "$base.couche" 2>/dev/null | head -1)

  # 2) OCR de la page 1 : seule voie pour les CV scannes, qui sont la majorite.
  #    Page 1 seulement — les coordonnees y sont toujours, et l OCR d un CV
  #    entier coute plusieurs secondes par page pour rien.
  #    On y passe des qu il MANQUE l un des deux : le telephone compte autant
  #    que l email, et il est souvent le seul present.
  if [ -z "$email" ] || [ -z "$tel" ]; then
    pdftoppm -r 200 -png -f 1 -l 1 "$base.pdf" "$base" 2>/dev/null
    page=$(ls "$base"-*.png 2>/dev/null | head -1)
    if [ -n "$page" ]; then
      tesseract "$page" "$base" -l "$LANGUE" 2>/dev/null
      [ -z "$email" ] && email=$(emails_du_fichier "$base.txt")
      [ -z "$tel" ] && tel=$(grep -oE "$RE_TEL" "$base.txt" 2>/dev/null | head -1)
    fi
  fi

  # Format homogene : les CV ecrivent 0612345678, 06.12.34.56.78, 06 12 34 56 78.
  if [ -n "$tel" ]; then
    tel=$(printf '%s' "$tel" | tr -d ' .' | sed -E 's/^\+33/0/' | sed -E 's/(..)/\1 /g' | sed 's/ $//')
  fi

  nomf=$(basename "$pdf")
  rang=$(printf '%s' "$nomf" | sed -nE 's/.*\(([0-9]+)\)\.pdf$/\1/p')
  [ -z "$rang" ] && rang=0
  printf '%s\t%s\t%s\t%s\n' "$rang" "$nomf" "$email" "$tel"
  if [ -n "$SORTIE" ]; then
    texte=$(cat "$base.couche" "$base.txt" 2>/dev/null | tr '\t\r\n' '   ' | tr -s ' ' | cut -c1-6000)
    printf '%s\t%s\t%s\t%s\t%s\n' "$rang" "$nomf" "$email" "$tel" "$texte" >> "$SORTIE"
  fi
done <<EOF
$(find "$SOURCE" -maxdepth 1 -iname "Document*.pdf" -mmin "-$MINUTES" -print 2>/dev/null \
  | sed -E 's/^(.*\(([0-9]+)\)\.pdf)$/\2\t\1/; t; s/^/0\t/' \
  | sort -n -k1,1 | cut -f2-)
EOF

if [ "$n" -eq 0 ]; then
  echo "Aucun Document*.pdf de moins de $MINUTES minutes dans $SOURCE." >&2
  echo "Les CV se telechargent-ils bien ? (clic reel dans Chrome, jamais fetch)" >&2
  exit 1
fi

echo "$n CV traites." >&2
