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
#   minutes = repli sans marqueur de debut de lot (defaut 240). Seuls les
#   Document*.pdf et ft-journal*.json de Downloads modifies dans cette fenetre
#   partent, plus les dossiers de tour crees par ocr-par-tour.sh (_cv-lot100). Un
#   Document.pdf plus ancien, qui n'est pas un CV du lot, reste en place.
#   Fichiers de travail = cv.tsv, choix.json, lot.json du lot : ils contiennent
#   aussi des donnees de candidats et partent a la corbeille avec le reste.
#
# v9.1 : un seul PowerShell pour tout le lot (0,2 s de demarrage par fichier mesure le
# 29/09/2026, soit ~20 s pour 100 CV auparavant).
# v9.2 : la fenetre part du marqueur de debut de lot (_cv-lot100/.debut-lot, pose par
# « ocr-par-tour.sh 0 ») : seuls les fichiers arrives depuis sont vises. Les minutes ne
# servent plus que de repli sans marqueur, et deviennent facultatives. Le fichier de jetons
# de charger-secrets.sh est supprime (pas mis a la corbeille : une copie de jeton n'y a rien
# a faire). ecartes.json reste : il sert aux lots suivants.
# v10.0 : route Playwright. Le dossier de telechargements du lot (playwright.js) part en entier,
# avec les copies que le serveur MCP garde dans <session>/.playwright-mcp/ (Document*.pdf,
# ft-journal*.json, captures page-* et journaux console-* du lot) et les fichiers ft-*.js
# generes, qui contiennent les noms connus.
# A lancer depuis le dossier de la session, comme le reste du skill.
set -u
MIN=240
case "${1:-}" in ''|*[!0-9]*) ;; *) MIN="$1"; shift ;; esac

if [ -n "${LOCALAPPDATA:-}" ]; then FT="$(cygpath -u "$LOCALAPPDATA" 2>/dev/null || printf '%s' "$LOCALAPPDATA")/france-travail-extraction/telechargements"
else FT="$HOME/.local/state/france-travail-extraction/telechargements"
fi
if   [ -d "$FT" ];                 then DL="$FT"
elif [ -d "$HOME/Downloads" ];       then DL="$HOME/Downloads"
elif [ -d "$HOME/Téléchargements" ]; then DL="$HOME/Téléchargements"
else echo "ERREUR : dossier Downloads introuvable sous $HOME" >&2; exit 1
fi

DEBUT="$DL/_cv-lot100/.debut-lot"
if [ -f "$DEBUT" ]; then
  # Copie du repere hors du dossier du lot : celui-ci part a la corbeille avant le controle final.
  REPERE=$(mktemp); touch -r "$DEBUT" "$REPERE"; FENETRE=(-newer "$REPERE")
  echo "fenetre : depuis le debut du lot ($(date -r "$DEBUT" '+%H:%M'))"
else
  REPERE=""; FENETRE=(-mmin -"$MIN")
  echo "fenetre : $MIN dernieres minutes (pas de marqueur de debut de lot : un PDF personnel recent serait pris)"
fi

cibles=()
while IFS= read -r f; do [ -n "$f" ] && cibles+=("$f"); done \
  < <(find "$DL" -maxdepth 1 -type f \( -name 'Document*.pdf' -o -name 'ft-journal*.json' \) "${FENETRE[@]}")
for f in "$@"; do [ -e "$f" ] && cibles+=("$f"); done
[ -d "$DL/_cv-lot100" ] && cibles+=("$DL/_cv-lot100")
if [ "$DL" = "$FT" ]; then
  # Dossier propre au lot : il part en entier, playwright.js le recree au lot suivant.
  cibles=("$FT")
  for f in "$@" "$PWD/.playwright-mcp"/Document*.pdf "$PWD/.playwright-mcp"/ft-journal*.json "$PWD/.playwright-mcp"/ft-*.js; do
    [ -e "$f" ] && cibles+=("$f")
  done
  # Captures et journaux console du serveur MCP pendant le lot : ils portent des noms de candidats.
  while IFS= read -r f; do [ -n "$f" ] && cibles+=("$f"); done \
    < <(find "$PWD/.playwright-mcp" -maxdepth 1 -type f \( -name 'page-*' -o -name 'console-*' \) "${FENETRE[@]}" 2>/dev/null)
fi

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

reste=$( [ -d "$DL" ] || { echo 0; exit 0; }; find "$DL" -maxdepth 1 -type f \( -name 'Document*.pdf' -o -name 'ft-journal*.json' \) "${FENETRE[@]}" | wc -l)
[ -n "$REPERE" ] && rm -f "$REPERE"

if [ -n "${LOCALAPPDATA:-}" ]; then SEC="$(cygpath -u "$LOCALAPPDATA" 2>/dev/null || printf '%s' "$LOCALAPPDATA")/france-travail-extraction/secrets.env"
else SEC="$HOME/.local/state/france-travail-extraction/secrets.env"
fi
SEC="${FT_SECRETS:-$SEC}"
[ -f "$SEC" ] && rm -f "$SEC" && echo "jetons du run supprimes"
echo "$n element(s) mis a la corbeille, $echec echec(s), $reste CV du lot encore dans $DL."
[ "$echec" -eq 0 ] && [ "$reste" -eq 0 ]
