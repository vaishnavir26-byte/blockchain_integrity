$token = "nfp_SYYLV1FabZB8wgGzNtxLGex8R3HCPRv739d6"
$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $user = Invoke-RestMethod -Uri "https://api.netlify.com/api/v1/user" -Headers $headers
    Write-Host "VALID TOKEN! User: $($user.full_name) ($($user.email))"
    $sites = Invoke-RestMethod -Uri "https://api.netlify.com/api/v1/sites" -Headers $headers
    Write-Host "Sites found: $($sites.Count)"
    foreach ($s in $sites) {
        Write-Host " - $($s.name) : $($s.ssl_url) (ID: $($s.id))"
    }
} catch {
    Write-Host "Error: $_"
}
