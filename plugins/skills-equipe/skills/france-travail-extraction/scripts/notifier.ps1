# Toast Windows du lot (reste a l ecran jusqu au clic). Remplace PushNotification et
# Windows MCP Notification : le premier exige Remote Control, le second refuse quand Julien
# utilise le poste (USER_CONTROL, mesure le 12/10/2026).
# -Alarme : sonnerie en boucle jusqu au clic, puis fenetre Chromium de Playwright mise au premier
# plan (ou son bouton de barre des taches qui clignote). Pour l appel a se connecter : le simple
# rappel a ete manque le 15/10/2026.
# Usage : powershell.exe -NoProfile -ExecutionPolicy Bypass -File notifier.ps1 -Titre T -Texte X [-Alarme]
param([string]$Titre, [string]$Texte, [switch]$Alarme)
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] > $null
$x = New-Object Windows.Data.Xml.Dom.XmlDocument
$e = [Security.SecurityElement]
$scenario = 'reminder'; $audio = ''
if ($Alarme) {
  $scenario = 'alarm'
  $audio = "<audio src='ms-winsoundevent:Notification.Looping.Alarm2' loop='true'/>"
}
$x.LoadXml("<toast scenario='$scenario'><visual><binding template='ToastGeneric'><text>$($e::Escape($Titre))</text><text>$($e::Escape($Texte))</text></binding></visual>$audio<actions><action content='OK' arguments='ok'/></actions></toast>")
$app = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show([Windows.UI.Notifications.ToastNotification]::new($x))
"toast envoye"
if (-not $Alarme) { exit 0 }

Add-Type @'
using System; using System.Runtime.InteropServices;
public static class FtWin {
  [StructLayout(LayoutKind.Sequential)] public struct FLASHWINFO { public uint cbSize; public IntPtr hwnd; public uint dwFlags; public uint uCount; public uint dwTimeout; }
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool FlashWindowEx(ref FLASHWINFO f);
}
'@
# Fenetre du Chromium Playwright : processus dont la ligne de commande porte le profil .chromium-claude.
$ids = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" |
  Where-Object { $_.CommandLine -like '*chromium-claude*' } | ForEach-Object { $_.ProcessId }
$w = Get-Process -Id $ids -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $w) { "fenetre Chromium introuvable"; exit 0 }
$h = $w.MainWindowHandle
[FtWin]::ShowWindow($h, 9) > $null
$devant = [FtWin]::SetForegroundWindow($h)
# Clignote jusqu a ce que la fenetre passe au premier plan (FLASHW_ALL | FLASHW_TIMERNOFG).
$f = New-Object FtWin+FLASHWINFO
$f.cbSize = [Runtime.InteropServices.Marshal]::SizeOf($f); $f.hwnd = $h; $f.dwFlags = 3 -bor 12
[FtWin]::FlashWindowEx([ref]$f) > $null
"fenetre Chromium : premier plan=$devant, clignote"
