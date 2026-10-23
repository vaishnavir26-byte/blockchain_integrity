$token = "nfp_SYYLV1FabZB8wgGzNtxLGex8R3HCPRv739d6"
$zipPath = "C:\Users\Admin\.gemini\antigravity\scratch\blocksure\blocksure_deploy.zip"

if (-not (Test-Path $zipPath)) {
    Write-Error "Deployment zip not found at $zipPath"
    exit 1
}

$bytes = [System.IO.File]::ReadAllBytes($zipPath)
$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    Write-Host "Connecting to Netlify with verified token..."
    $sites = Invoke-RestMethod -Uri "https://api.netlify.com/api/v1/sites" -Headers $headers

    $targetSite = $null
    foreach ($s in $sites) {
        Write-Host "Found site: $($s.name) -> $($s.ssl_url) (ID: $($s.id))"
        if ($s.id -eq "97a5fdaa-4aa7-451d-8a7b-cbf5f925d0e0" -or $s.name -like "*filechain-integrity*") {
            $targetSite = $s
        }
    }

    if (-not $targetSite) {
        $targetSite = $sites[0]
    }

    Write-Host "Uploading BlockSure production bundle to Netlify site: $($targetSite.name)..."
    $deployHeaders = @{
        "Authorization" = "Bearer $token"
        "Content-Type"  = "application/zip"
    }
    $deployUrl = "https://api.netlify.com/api/v1/sites/$($targetSite.id)/deploys"
    $deployRes = Invoke-RestMethod -Uri $deployUrl -Method Post -Headers $deployHeaders -Body $bytes

    Write-Host ""
    Write-Host "=========================================================="
    Write-Host "🎉 BLOCKSURE SUCCESSFULLY DEPLOYED TO NETLIFY!"
    Write-Host "Live Production URL: $($targetSite.ssl_url)"
    Write-Host "Deploy ID:           $($deployRes.id)"
    Write-Host "Deploy State:        $($deployRes.state)"
    Write-Host "Deploy Preview URL:  $($deployRes.deploy_ssl_url)"
    Write-Host "=========================================================="
    Write-Host ""
} catch {
    Write-Host "Netlify Error: $_"
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Details: $($reader.ReadToEnd())"
    }
}
