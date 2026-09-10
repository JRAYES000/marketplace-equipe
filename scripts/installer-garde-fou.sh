#!/usr/bin/env bash
# Installe le hook pre-commit qui bloque un commit contenant une cle d'API.
# A lancer une fois par clone :
#
#   bash scripts/installer-garde-fou.sh
#
# Un hook git ne se transmet pas avec le depot : chacun doit le poser chez lui.
# L'Action GitHub attrape ce qui passe malgre tout, mais apres le push --
# c'est-a-dire trop tard pour la cle.

set -eu

RACINE=$(git rev-parse --show-toplevel)
HOOK="$RACINE/.git/hooks/pre-commit"

cat > "$HOOK" <<'FIN'
#!/usr/bin/env bash
set -u
RACINE=$(git rev-parse --show-toplevel)
mapfile -t INDEXES < <(git diff --cached --name-only --diff-filter=ACM)
[ "${#INDEXES[@]}" -eq 0 ] && exit 0
exec bash "$RACINE/scripts/scan-secrets.sh" "${INDEXES[@]}"
FIN

chmod +x "$HOOK"
chmod +x "$RACINE/scripts/scan-secrets.sh" 2>/dev/null || true

echo "Hook pre-commit installe : $HOOK"
echo "Controle immediat sur le depot entier :"
bash "$RACINE/scripts/scan-secrets.sh" && echo "  rien a signaler."
