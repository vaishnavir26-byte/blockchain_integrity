param(
    [Parameter(Mandatory=$true)]
    [string]$token
)

$owner = "vaishnavir26-byte"
$repo = "blockchain_file_integrity"
$projectRoot = "C:\Users\Admin\.gemini\antigravity\scratch\blocksure"

Write-Host "=========================================================="
Write-Host "  PUSHING BLOCKSURE TO GITHUB REPOSITORY: $owner/$repo"
Write-Host "=========================================================="

$headers = @{
    "Authorization" = "token $token"
    "User-Agent"    = "BlockSure-Publisher"
    "Accept"        = "application/vnd.github.v3+json"
}

# 1. Verify token & repo
try {
    $user = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers
    Write-Host "Authenticated as GitHub User: $($user.login)"

    $repoInfo = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo" -Headers $headers
    Write-Host "Target repository found: $($repoInfo.full_name) (Default branch: $($repoInfo.default_branch))"
} catch {
    Write-Error "Authentication or repository lookup failed: $_"
    exit 1
}

$defaultBranch = if ($repoInfo.default_branch) { $repoInfo.default_branch } else { "main" }

# 2. Get latest commit SHA on branch (if exists)
$latestCommitSha = $null
$baseTreeSha = $null
try {
    $refInfo = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/ref/heads/$defaultBranch" -Headers $headers
    $latestCommitSha = $refInfo.object.sha
    Write-Host "Existing branch head found: $latestCommitSha"
    $commitInfo = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/commits/$latestCommitSha" -Headers $headers
    $baseTreeSha = $commitInfo.tree.sha
} catch {
    Write-Host "Branch '$defaultBranch' is empty or not created yet. Will initialize repository root."
}

# 3. Gather project files to commit (excluding node_modules, dist, cache, artifacts, zip)
$excludeDirs = @("node_modules", "dist", "artifacts", "cache", ".git", ".system_generated")
$excludeExts = @(".zip", ".log")

Write-Host "Scanning local files to upload..."
$filesToUpload = Get-ChildItem -Path $projectRoot -Recurse -File | Where-Object {
    $rel = $_.FullName.Substring($projectRoot.Length + 1)
    $skip = $false
    foreach ($ex in $excludeDirs) {
        if ($rel.StartsWith("$ex\") -or $rel -eq $ex -or $rel.Contains("\$ex\")) {
            $skip = $true
            break
        }
    }
    if ($skip) { return $false }
    foreach ($ext in $excludeExts) {
        if ($_.Extension -eq $ext) { return $false }
    }
    return $true
}

Write-Host "Found $($filesToUpload.Count) files to commit."

# 4. Upload blobs
$treeItems = @()
$counter = 0
foreach ($file in $filesToUpload) {
    $counter++
    $relPath = $file.FullName.Substring($projectRoot.Length + 1).Replace("\", "/")
    
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $b64 = [System.Convert]::ToBase64String($bytes)
    
    $blobBody = @{
        content = $b64
        encoding = "base64"
    } | ConvertTo-Json

    $blobRes = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/blobs" -Method Post -Headers $headers -Body $blobBody -ContentType "application/json"
    
    $treeItems += @{
        path = $relPath
        mode = "100644"
        type = "blob"
        sha = $blobRes.sha
    }

    if ($counter % 10 -eq 0 -or $counter -eq $filesToUpload.Count) {
        Write-Host "Uploaded blobs: $counter / $($filesToUpload.Count)"
    }
}

# 5. Create new Git Tree
Write-Host "Creating Git tree on GitHub..."
$treeBodyObj = @{
    tree = $treeItems
}
if ($baseTreeSha) {
    $treeBodyObj["base_tree"] = $baseTreeSha
}
$treeBodyJson = $treeBodyObj | ConvertTo-Json -Depth 5

$treeRes = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/trees" -Method Post -Headers $headers -Body $treeBodyJson -ContentType "application/json"
$newTreeSha = $treeRes.sha
Write-Host "New Tree SHA: $newTreeSha"

# 6. Create Git Commit
Write-Host "Creating Git commit..."
$commitMsg = "BlockSure - Initial production release: Smart contracts, RBAC access control, version lineage, tests, and web frontend"
$commitBodyObj = @{
    message = $commitMsg
    tree = $newTreeSha
}
if ($latestCommitSha) {
    $commitBodyObj["parents"] = @($latestCommitSha)
} else {
    $commitBodyObj["parents"] = @()
}
$commitBodyJson = $commitBodyObj | ConvertTo-Json

$commitRes = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/commits" -Method Post -Headers $headers -Body $commitBodyJson -ContentType "application/json"
$newCommitSha = $commitRes.sha
Write-Host "New Commit SHA: $newCommitSha"

# 7. Update branch ref (or create if new)
Write-Host "Updating reference refs/heads/$defaultBranch..."
if ($latestCommitSha) {
    $refBodyJson = @{
        sha = $newCommitSha
        force = $true
    } | ConvertTo-Json

    $refRes = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/refs/heads/$defaultBranch" -Method Patch -Headers $headers -Body $refBodyJson -ContentType "application/json"
} else {
    $refBodyJson = @{
        ref = "refs/heads/$defaultBranch"
        sha = $newCommitSha
    } | ConvertTo-Json

    $refRes = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/refs" -Method Post -Headers $headers -Body $refBodyJson -ContentType "application/json"
}

Write-Host ""
Write-Host "=========================================================="
Write-Host "🎉 ALL CODES SUCCESSFULLY COMMITTED & PUSHED TO GITHUB!"
Write-Host "Repository: https://github.com/$owner/$repo"
Write-Host "Branch:     $defaultBranch"
Write-Host "Commit:     $newCommitSha"
Write-Host "=========================================================="
