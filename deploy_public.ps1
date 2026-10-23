$token = "nfp_SYYLV1FabZB8wgGzNtxLGex8R3HCPRv739d6"
$zipPath = "C:\Users\Admin\.gemini\antigravity\scratch\blocksure\blocksure_deploy.zip"
$bytes = [System.IO.File]::ReadAllBytes($zipPath)

$deployHeaders = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/zip"
}

$siteId = "8bbdd612-09ec-4ac5-b67d-9ee032c7a697"
$deployUrl = "https://api.netlify.com/api/v1/sites/$siteId/deploys"

Write-Host "Deploying BlockSure build to public Netlify site (ID: $siteId)..."
$res = Invoke-RestMethod -Uri $deployUrl -Method Post -Headers $deployHeaders -Body $bytes

Write-Host "=========================================="
Write-Host "PUBLIC DEPLOYMENT SUCCESSFUL!"
Write-Host "URL:   $($res.ssl_url)"
Write-Host "State: $($res.state)"
Write-Host "ID:    $($res.id)"
Write-Host "=========================================="
