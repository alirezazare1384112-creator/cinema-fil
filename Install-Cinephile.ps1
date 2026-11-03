# Cinephile Vault — One-Line Installer (PowerShell)
# This script downloads and runs the CinephileInstaller.bat from GitHub.
# It bypasses SmartScreen blocking of downloaded .bat files.
#
# HOW TO USE (3 steps):
#   1. Press Win+R (opens Run dialog)
#   2. Paste this entire line and press Enter:
#
#   powershell -NoProfile -ExecutionPolicy Bypass -Command "& { [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; $u='https://raw.githubusercontent.com/alirezazare1384112-creator/cinema-fil/master/CinephileInstaller.bat'; $f=\"$env:TEMP\cin.bat\"; try { (New-Object Net.WebClient).DownloadFile($u,$f) } catch { Write-Host 'Download failed. Try with VPN.'; pause; exit }; & $f }"
#
#   3. Wait 3-5 minutes. The installer will download Node.js + project + create desktop shortcut.

# Force TLS 1.2 (required by GitHub)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$urls = @(
    'https://raw.githubusercontent.com/alirezazare1384112-creator/cinema-fil/master/CinephileInstaller.bat',
    'https://ghproxy.com/https://raw.githubusercontent.com/alirezazare1384112-creator/cinema-fil/master/CinephileInstaller.bat',
    'https://mirror.ghproxy.com/https://raw.githubusercontent.com/alirezazare1384112-creator/cinema-fil/master/CinephileInstaller.bat'
)

$f = "$env:TEMP\cin.bat"
$downloaded = $false

foreach ($u in $urls) {
    Write-Host "[check] Trying: $u"
    try {
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile($u, $f)
        if ((Test-Path $f) -and (Get-Item $f).Length -gt 5000) {
            Write-Host "[ok] Downloaded successfully ($(((Get-Item $f).Length / 1024).ToString('N1')) KB)"
            $downloaded = $true
            break
        }
    } catch {
        Write-Host "[fail] $($_.Exception.Message.Substring(0, [Math]::Min(80, $_.Exception.Message.Length)))"
    }
}

if (-not $downloaded) {
    Write-Host ""
    Write-Host "============================================================"
    Write-Host "  ERROR: Could not download the installer."
    Write-Host ""
    Write-Host "  Solutions:"
    Write-Host "    1. Turn on VPN and try again"
    Write-Host "    2. Change DNS: Settings > Network > IPv4 > 8.8.8.8"
    Write-Host "    3. Download manually from:"
    Write-Host "       https://github.com/alirezazare1384112-creator/cinema-fil/releases"
    Write-Host "============================================================"
    pause
    exit 1
}

Write-Host ""
Write-Host "============================================================"
Write-Host "  Starting Cinephile Vault Installer..."
Write-Host "============================================================"
Write-Host ""

# Run the .bat file from TEMP (avoids SmartScreen blocking)
& $f

# Cleanup
Remove-Item $f -ErrorAction SilentlyContinue
