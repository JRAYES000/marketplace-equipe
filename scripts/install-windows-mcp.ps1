# Installe le connecteur Windows MCP pour Claude, sur Windows.
# Usage : irm https://raw.githubusercontent.com/JRAYES000/marketplace-equipe/main/scripts/install-windows-mcp.ps1 | iex
#
# Ce script : installe uv si besoin, ajoute windows-mcp au fichier de
# configuration de Claude (avec sauvegarde), et vérifie que le résultat
# est valide. Il ne touche à rien d'autre et peut être relancé sans risque.

param(
    [string]$ConfigPath = "$env:APPDATA\Claude\claude_desktop_config.json"
)

$ErrorActionPreference = 'Stop'
$entry = '"windows-mcp": { "command": "uvx", "args": ["windows-mcp", "serve"] }'

function Etape($n, $texte) { Write-Host "`n[$n] $texte" -ForegroundColor Cyan }
function OK($texte)        { Write-Host "    OK  $texte" -ForegroundColor Green }
function Info($texte)      { Write-Host "    --  $texte" -ForegroundColor Gray }
function Souci($texte)     { Write-Host "    !!  $texte" -ForegroundColor Yellow }

Write-Host "Installation du connecteur Windows MCP pour Claude" -ForegroundColor White

# --- 1. uv (l'outil qui fait tourner le serveur) -------------------------
Etape 1 "Verification de uv"
if (Get-Command uvx -ErrorAction SilentlyContinue) {
    OK "uv est deja installe"
} else {
    Info "uv est absent, installation en cours (1 a 2 minutes)"
    try {
        winget install -e --id astral-sh.uv --accept-source-agreements --accept-package-agreements | Out-Null
    } catch {
        Info "winget indisponible, passage par l'installeur officiel"
        Invoke-RestMethod https://astral.sh/uv/install.ps1 | Invoke-Expression
    }
    $env:Path = "$env:USERPROFILE\.local\bin;" + [Environment]::GetEnvironmentVariable('Path', 'User') + ';' + [Environment]::GetEnvironmentVariable('Path', 'Machine')
    if (Get-Command uvx -ErrorAction SilentlyContinue) {
        OK "uv installe"
    } else {
        Souci "uv ne repond pas encore. Ferme cette fenetre PowerShell, rouvre-en une neuve et relance la commande."
        return
    }
}

# --- 2. Fichier de configuration -----------------------------------------
Etape 2 "Fichier de configuration de Claude"
Info $ConfigPath

$dossier = Split-Path $ConfigPath -Parent
if (-not (Test-Path $dossier)) { New-Item -ItemType Directory -Force -Path $dossier | Out-Null }

if (-not (Test-Path $ConfigPath)) {
    [IO.File]::WriteAllText($ConfigPath, "{`n  `"mcpServers`": {`n    $entry`n  }`n}")
    OK "Fichier cree avec le connecteur"
    Etape 3 "Termine"
    Write-Host "`n    Ferme completement Claude, puis rouvre-le." -ForegroundColor White
    Write-Host "    Le connecteur apparait dans Personnaliser > Connecteurs.`n" -ForegroundColor White
    return
}

$contenu = [IO.File]::ReadAllText($ConfigPath)

# Le fichier doit etre un JSON valide avant qu'on y touche.
try { $contenu | ConvertFrom-Json | Out-Null }
catch {
    Souci "Le fichier de configuration est illisible (JSON invalide). Rien n'a ete modifie."
    Souci "Renomme-le puis relance la commande : elle en creera un neuf."
    return
}

if ($contenu -match '"windows-mcp"') {
    OK "Le connecteur est deja present, rien a changer"
    Etape 3 "Termine"
    Write-Host "`n    Si tu ne le vois pas dans Claude, ferme-le completement et rouvre-le.`n" -ForegroundColor White
    return
}

# --- 3. Ajout du connecteur ----------------------------------------------
Etape 3 "Ajout du connecteur"
$sauvegarde = "$ConfigPath.bak"
Copy-Item $ConfigPath $sauvegarde -Force
Info "Sauvegarde : $sauvegarde"

if ($contenu -match '"mcpServers"\s*:\s*\{') {
    $nouveau = $contenu -replace '"mcpServers"\s*:\s*\{', ('"mcpServers": {' + "`n    " + $entry + ',')
} else {
    # Pas de bloc mcpServers : on l'insere juste apres l'accolade ouvrante.
    $i = $contenu.IndexOf('{')
    if ($i -lt 0) { Souci "Format inattendu, rien n'a ete modifie."; return }
    $nouveau = $contenu.Insert($i + 1, "`n  `"mcpServers`": {`n    $entry`n  },")
}

[IO.File]::WriteAllText($ConfigPath, $nouveau)

try {
    $j = [IO.File]::ReadAllText($ConfigPath) | ConvertFrom-Json
    if (-not $j.mcpServers.'windows-mcp') { throw "connecteur absent apres ecriture" }
    OK "Connecteur ajoute, fichier valide"
    Info ("Connecteurs presents : " + (($j.mcpServers.PSObject.Properties.Name) -join ', '))
} catch {
    Copy-Item $sauvegarde $ConfigPath -Force
    Souci "Echec de l'ecriture, la sauvegarde a ete restauree. Rien n'est casse."
    Souci $_.Exception.Message
    return
}

Write-Host "`n    Ferme completement Claude, puis rouvre-le." -ForegroundColor White
Write-Host "    Le connecteur apparait dans Personnaliser > Connecteurs.`n" -ForegroundColor White
