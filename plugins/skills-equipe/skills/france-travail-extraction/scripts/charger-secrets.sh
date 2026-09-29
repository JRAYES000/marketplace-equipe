#!/usr/bin/env bash
# Charge les trois jetons du run depuis le coffre de Julien (depot prive
# JRAYES000/claude-config, env/secrets.md) vers un fichier lu par notion.js et nocodb.js.
#
# Pourquoi (v9.2) : le 29/09/2026, un export bash fait a la main a execute les backticks
# qui entourent certaines valeurs du coffre, et l'erreur a affiche une partie de
# NOCODB_TOKEN. Ici, rien ne passe par un export : backticks et espaces sont retires,
# la valeur va dans un fichier a droits 600, et la sortie ne porte que des noms.
#
# Usage : bash charger-secrets.sh
#   Ecrit %LOCALAPPDATA%/france-travail-extraction/secrets.env (ou $FT_SECRETS).
#   nettoyer-cv.sh l'envoie a la corbeille en fin de run.
# Hors du poste de Julien : definir NOTION_TOKEN_FT, NOCODB_URL et NOCODB_TOKEN dans
# l'environnement ; ce script n'est alors pas necessaire.
#
# Format du coffre (identique a visibilite-ops/scripts/coffre-registre.sh) : 11 colonnes,
# cle en colonne 3, valeur en colonne 6. Une ligne au nombre de colonnes different (valeur
# contenant « | ») est refusee : la lire decalerait les colonnes.
set -u
set -o pipefail

if [ -n "${LOCALAPPDATA:-}" ]; then D="$(cygpath -u "$LOCALAPPDATA" 2>/dev/null || printf '%s' "$LOCALAPPDATA")/france-travail-extraction"
else D="$HOME/.local/state/france-travail-extraction"
fi
F="${FT_SECRETS:-$D/secrets.env}"
CLES="NOTION_TOKEN_FT NOCODB_URL NOCODB_TOKEN"

mkdir -p "$(dirname "$F")"
umask 177
TMP="$F.tmp"
if ! gh api repos/JRAYES000/claude-config/contents/env/secrets.md --jq .content | base64 -d |
  awk -F'|' -v cles="$CLES" '
    BEGIN { n = split(cles, a, " "); for (i = 1; i <= n; i++) voulu[a[i]] = 1 }
    /^\|/ {
      cle = $3; gsub(/^[ `]+|[ `]+$/, "", cle)
      if (!(cle in voulu)) next
      if (NF != 11) { print "ligne non sure (colonnes decalees) : " cle > "/dev/stderr"; next }
      v = $6; gsub(/^[ `]+|[ `]+$/, "", v)
      if (v != "") print cle "=" v
    }' > "$TMP"; then
  rm -f "$TMP"; echo "ERREUR : lecture du coffre impossible (gh connecte ? acces au depot claude-config ?)" >&2; exit 1
fi
mv -f "$TMP" "$F"

manque=""
for k in $CLES; do cut -d= -f1 "$F" | grep -qx "$k" || manque="$manque $k"; done
echo "secrets charges : $(cut -d= -f1 "$F" | tr '\n' ' ')-> $F (valeurs jamais affichees)"
if [ -n "$manque" ]; then echo "ERREUR : absent(s) du coffre :$manque" >&2; exit 1; fi
