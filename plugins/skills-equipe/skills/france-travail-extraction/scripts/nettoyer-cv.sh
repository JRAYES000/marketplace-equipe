#!/usr/bin/env bash
# Envoie a la corbeille les CV d'un lot TERMINE : a lancer seulement apres la
# barriere de la Phase 6 (compte relu dans NocoDB = compte attendu).
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
set -u
MIN="${1:-240}"
shift 2>/dev/null

if   [ -d "$HOME/Downloads" ];       then DL="$HOME/Downloads"
elif [ -d "$HOME/Téléchargements" ]; then DL="$HOME/Téléchargements"
else echo "ERREUR : dossier Downloads introuvable sous $HOME" >&2; exit 1
fi

a_la_corbeille() {
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*)
      # Chemin passe par variable d'environnement : les noms contiennent des
      # espaces et des parentheses, que les guillemets PowerShell digerent mal.
      CIBLE="$(cygpath -w "$1")" powershell.exe -NoProfile -Command '
        Add-Type -AssemblyName Microsoft.VisualBasic
        $f = $env:CIBLE
        if (Test-Path -LiteralPath $f -PathType Container) {
          [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($f, "OnlyErrorDialogs", "SendToRecycleBin")
        } else {
          [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($f, "OnlyErrorDialogs", "SendToRecycleBin")
        }' ;;
    Darwin) mv "$1" "$HOME/.Trash/" ;;
    *) echo "ERREUR : systeme non gere pour la corbeille" >&2; return 1 ;;
  esac
}

n=0; echec=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  if a_la_corbeille "$f"; then n=$((n + 1)); else echec=$((echec + 1)); fi
done < <(find "$DL" -maxdepth 1 -type f \( -name 'Document*.pdf' -o -name 'ft-journal*.json' \) -mmin -"$MIN")

for f in "$@"; do
  [ -e "$f" ] || continue
  if a_la_corbeille "$f"; then n=$((n + 1)); else echec=$((echec + 1)); fi
done

if [ -d "$DL/_cv-lot100" ]; then
  if a_la_corbeille "$DL/_cv-lot100"; then n=$((n + 1)); else echec=$((echec + 1)); fi
fi

reste=$(find "$DL" -maxdepth 1 -type f \( -name 'Document*.pdf' -o -name 'ft-journal*.json' \) -mmin -"$MIN" | wc -l)
echo "$n element(s) mis a la corbeille, $echec echec(s), $reste CV du lot encore dans $DL."
[ "$echec" -eq 0 ] && [ "$reste" -eq 0 ]
