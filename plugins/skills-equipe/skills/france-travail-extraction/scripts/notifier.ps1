# Toast Windows du lot (rappel, reste a l ecran jusqu au clic). Remplace PushNotification et
# Windows MCP Notification : le premier exige Remote Control, le second refuse quand Julien
# utilise le poste (USER_CONTROL, mesure le 12/10/2026).
# Usage : powershell.exe -NoProfile -ExecutionPolicy Bypass -File notifier.ps1 -Titre T -Texte X
param([string]$Titre, [string]$Texte)
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] > $null
$x = New-Object Windows.Data.Xml.Dom.XmlDocument
$e = [Security.SecurityElement]
$x.LoadXml("<toast scenario='reminder'><visual><binding template='ToastGeneric'><text>$($e::Escape($Titre))</text><text>$($e::Escape($Texte))</text></binding></visual><actions><action content='OK' arguments='ok'/></actions></toast>")
$app = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show([Windows.UI.Notifications.ToastNotification]::new($x))
"toast envoye"
