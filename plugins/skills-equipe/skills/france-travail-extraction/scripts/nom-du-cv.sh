#!/usr/bin/env bash
# Extrait le nom probable d un CV : lignes courtes portant un mot en capitales,
# hors email / telephone / URL. Un CV revele l identite d un profil anonyme, et
# tranche un appariement que l email seul ne permet pas d etablir.
set -u
for d in "$LOCALAPPDATA/Microsoft/WinGet/Packages"/oschwartz10612.Poppler_*/poppler-*/Library/bin "/c/Program Files/Tesseract-OCR"; do
  [ -d "$d" ] && PATH="$PATH:$d"
done
export PATH
f="$1"
[ -f "$f" ] || { echo "ABSENT"; exit 0; }
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
pdftotext "$f" "$tmp/couche.txt" 2>/dev/null
src="$tmp/couche.txt"
if [ ! -s "$src" ] || [ "$(grep -c . "$src")" -lt 3 ]; then
  pdftoppm -r 200 -png -f 1 -l 1 "$f" "$tmp/p" 2>/dev/null
  pg=$(ls "$tmp"/p-*.png 2>/dev/null | head -1)
  if [ -n "$pg" ]; then tesseract "$pg" "$tmp/ocr" -l eng 2>/dev/null; src="$tmp/ocr.txt"; fi
fi
[ -s "$src" ] || { echo "ILLISIBLE"; exit 0; }
grep . "$src" \
  | grep -vE "@|https?://|[0-9]{2}[ .][0-9]{2}[ .][0-9]{2}" \
  | awk 'length($0) >= 4 && length($0) <= 42' \
  | grep -E "[A-ZÀ-Ü]{2,}" \
  | head -3
