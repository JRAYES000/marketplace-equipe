#!/usr/bin/env bash
# Envoie a la corbeille les CV d'un lot TERMINE : a lancer seulement apres la
# barriere de la Phase 6 (compte relu dans Notion = compte attendu).
#
# Pourquoi : les CV sont des donnees de candidats (RGPD), et des Document (n).pdf
# laisses dans Downloads se melangent au lot suivant — l'appariement par ordre de
# telechargement devient alors faux sans aucun message d'erreur.
#
# Corbeille et pas suppression definitive : Julien la vide lui-meme.
#
# Usage : bash nettoyer-cv.sh [minutes] [fichier de travail]...
#   minutes = age maximum des fichiers vises (defaut 240). Seuls les
#   Document*.pdf et ft-journal*.json de Downloads modifies dans cette fenetre
#   partent, plus les dossiers de tour crees par ocr-par-tour.sh (_cv-lot100). Un
#   Document.pdf plus ancien, qui n'est pas un CV du lot, reste en place.
#   Fichiers de travail = cv.tsv, choix.json, lot.json du lot : ils contiennent
#   aussi des donnees de candidats et partent a la corbeille avec le reste.
#
# v9.1 : un seul PowerShell pour tout le lot (0,2 s de demarrage par fichier mesure le
# 29/09/2026, soit ~20 s pour 100 CV auparavant).
set -u
MIN="${1:-240}"
shift 2>/dev/null

if   [ -d "$HOME/Downloads" ];       then DL="$HOME/Downloads"
elif [ -d "$HOME/Téléchargements" ]; then DL="$HOME/Téléchargements"
else echo "ERREUR : dossier Downloads introuvable sous $HOME" >&2; exit 1
fi

cibles=()
while IFS= read -r f; do [ -n "$f" ] && cibles+=("$f"); done \
  < <(find "$DL" -maxdepth 1 -type f \( -name 'Document*.pdf' -o -name 'ft-journal*.json' \) -mmin -"$MIN")
for f in "$@"; do [ -e "$f" ] && cibles+=("$f"); done
[ -d "$DL/_cv-lot100" ] && cibles+=("$DL/_cv-lot100")

n=0; echec=0
if [ "${#cibles[@]}" -gt 0 ]; then
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*)
      # Liste passee par fichier (UTF-8) : les noms contiennent espaces et parentheses.
      liste=$(mktemp)
      for f in "${cibles[@]}"; do cygpath -w "$f"; done > "$liste"
      res=$(LISTE="$(cygpath -w "$liste")" powershell.exe -NoProfile -Command '
        Add-Type -AssemblyName Microsoft.VisualBasic
        foreach ($f in [IO.File]::ReadAllLines($env:LISTE, [Text.Encoding]::UTF8)) {
          if (-not $f) { continue }
          try {
            if (Test-Path -LiteralPath $f -PathType Container) {
              [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($f, "OnlyErrorDialogs", "SendToRecycleBin")
            } else {
              [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($f, "OnlyErrorDialogs", "SendToRecycleBin")
            }
            "OK"
          } catch { "KO" }
        }')
      rm -f "$liste"
      n=$(printf '%s\n' "$res" | grep -c '^OK')
      echec=$(( ${#cibles[@]} - n )) ;;
    Darwin)
      for f in "${cibles[@]}"; do if mv "$f" "$HOME/.Trash/"; then n=$((n + 1)); else echec=$((echec + 1)); fi; done ;;
    *) echo "ERREUR : systeme non gere pour la corbeille" >&2; exit 1 ;;
  esac
fi

reste=$(find "$DL" -maxdepth 1 -type f \( -name 'Document*.pdf' -o -name 'ft-journal*.json' \) -mmin -"$MIN" | wc -l)
echo "$n element(s) mis a la corbeille, $echec echec(s), $reste CV du lot encore dans $DL."
[ "$echec" -eq 0 ] && [ "$reste" -eq 0 ]
