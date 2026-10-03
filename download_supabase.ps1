$release = Invoke-RestMethod -Uri "https://api.github.com/repos/supabase/cli/releases/latest"
$asset = $release.assets | Where-Object { $_.name -like "*windows_amd64.zip*" } | Select-Object -First 1
$url = $asset.browser_download_url
Write-Host "Downloading Supabase CLI from: $url"
$zipPath = "$env:TEMP\supabase.zip"
Invoke-WebRequest -Uri $url -OutFile $zipPath
Expand-Archive -Path $zipPath -DestinationPath "C:\Users\HP\AppData\Roaming\npm" -Force
Remove-Item $zipPath
Write-Host "Supabase CLI successfully installed!"
