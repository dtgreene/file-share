$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut("$PSScriptRoot\FileShare.lnk")
$shortcut.TargetPath = "cmd.exe"
$shortcut.Arguments = "/k set SHARE_PATH=C:/Users/$env:USERNAME/Shared && node index.js"
$shortcut.WorkingDirectory = (Resolve-Path "$PSScriptRoot\..").Path
$shortcut.IconLocation = "$PSScriptRoot\shrek.ico"
$shortcut.Save()
