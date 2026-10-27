<#
  Builds the free-hosting version of the site into .\deploy and, with -Deploy, uploads it to Cloudflare Pages.

  .\publish-static.ps1            # build only (check it locally first)
  .\publish-static.ps1 -Deploy    # build and publish

  Run it again whenever you add, remove or rename folders, or edit appsettings.json / listings.json.
  Only changed files are re-uploaded.
#>
param(
    [switch]$Deploy,
    [string]$ProjectName = "kl-room-finder"
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$out = Join-Path $root "deploy"
New-Item -ItemType Directory -Force $out | Out-Null

# Old hashed JS/CSS bundles are cleared; exported photos and videos in \m are kept and only updated if changed.
Remove-Item -Recurse -Force (Join-Path $out "assets") -ErrorAction SilentlyContinue

Push-Location (Join-Path $root "client")
try {
    if (-not (Test-Path "node_modules")) { npm.cmd install --no-fund --no-audit; if ($LASTEXITCODE) { throw "npm install failed" } }
    npm.cmd run build:static
    if ($LASTEXITCODE) { throw "React build failed" }
}
finally { Pop-Location }

dotnet run --project (Join-Path $root "server\RoomRental.Api") -- export $out
if ($LASTEXITCODE) { throw "Export failed" }

if ($Deploy) {
    # Uses the wrangler installed in client\node_modules (sign in once first with: npx.cmd wrangler login).
    # Runs from the website folder so the video range-request function in .\functions is deployed too.
    Push-Location $root
    try { & (Join-Path $root "client\node_modules\.bin\wrangler.cmd") pages deploy $out --project-name $ProjectName --branch main --commit-dirty=true }
    finally { Pop-Location }
    if ($LASTEXITCODE) { throw "Upload to Cloudflare Pages failed" }
}
else {
    Write-Host "`nBuilt into $out. Preview it with:  npx.cmd --prefix client vite preview client --outDir ../deploy" -ForegroundColor Green
}
