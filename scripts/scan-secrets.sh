#!/usr/bin/env bash
# Detecte une cle d'API dans des fichiers. Sortie 1 si quelque chose est trouve.
#
#   scripts/scan-secrets.sh fichier1 fichier2 ...   -> scanne ces fichiers
#   scripts/scan-secrets.sh                          -> scanne tout le depot
#
# Utilise par le hook pre-commit (scripts/installer-garde-fou.sh) et par
# l'Action .github/workflows/scan-secrets.yml.

set -u

MOTIFS='apify_api_[A-Za-z0-9]{30,}|sk-or-v1-[a-f0-9]{40,}|ntn_[A-Za-z0-9]{30,}|secret_[A-Za-z0-9]{35,}|sk-ant-[A-Za-z0-9_-]{40,}|sk-proj-[A-Za-z0-9_-]{40,}|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|xox[baprs]-[0-9A-Za-z-]{20,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{32}|-----BEGIN [A-Z ]*PRIVATE KEY-----'

if [ "$#" -gt 0 ]; then
  CIBLES=("$@")
else
  mapfile -t CIBLES < <(git ls-files)
fi

TROUVE=0

for f in "${CIBLES[@]}"; do
  [ -f "$f" ] || continue

  case "$f" in
    scripts/scan-secrets.sh|.github/workflows/scan-secrets.yml) continue ;;
  esac

  # Un .env suivi par git est une faute en soi, meme vide.
  case "$(basename "$f")" in
    .env|.env.*)
      if [ "$(basename "$f")" != ".env.example" ]; then
        echo "REFUS  $f : un fichier .env ne se commite jamais (seul .env.example est autorise)."
        TROUVE=1
        continue
      fi
      ;;
  esac

  # -I : ignore le binaire. Les fins de ligne CRLF ne genent pas grep -E.
  if LIGNES=$(grep -n -I -E "$MOTIFS" "$f" 2>/dev/null); then
    NUMS=$(printf '%s\n' "$LIGNES" | cut -d: -f1 | tr '\n' ' ')
    echo "REFUS  $f : cle d'API detectee ligne(s) $NUMS"
    TROUVE=1
  fi
done

if [ "$TROUVE" -ne 0 ]; then
  cat <<'FIN'

-------------------------------------------------------------------
Ce depot est PUBLIC. Une cle poussee dedans est compromise.

Que faire :
  1. Retirer la valeur du fichier ; la lire depuis une variable
     d'environnement a la place.
  2. Si elle a deja ete poussee : la REVOQUER sur le service concerne.
     Reecrire l'historique ne suffit pas, la valeur a ete vue.

Les cles de l'equipe vivent dans JRAYES000/claude-config (prive),
fichier env/secrets.md. Elles n'en sortent pas.
-------------------------------------------------------------------
FIN
  exit 1
fi

exit 0
