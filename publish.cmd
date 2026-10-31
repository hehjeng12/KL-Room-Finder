@echo off
rem Batch-file twin of publish-static.ps1, for PCs where PowerShell only runs signed scripts.
rem   publish.cmd           build only (check it locally first)
rem   publish.cmd deploy    build and publish to Cloudflare Pages
rem Run it again whenever you add, remove or rename folders, or edit appsettings / listings.json.
setlocal
cd /d "%~dp0"

rem Old hashed JS/CSS bundles are cleared; exported photos and videos are kept and only updated if changed.
if exist "deploy\assets" rmdir /s /q "deploy\assets"

pushd client
if not exist node_modules (
    call npm.cmd install --no-fund --no-audit || goto :fail
)
call npm.cmd run build:static || goto :fail
popd

dotnet run --project "server\RoomRental.Api" -- export "%~dp0deploy" || goto :fail

if /i "%~1"=="deploy" (
    rem Runs from the website folder so the video function in .\functions is uploaded too.
    call "client\node_modules\.bin\wrangler.cmd" pages deploy deploy --project-name kl-room-finder --branch main --commit-dirty=true || goto :fail
) else (
    echo.
    echo Built into the deploy folder. Run "publish.cmd deploy" to upload it.
)
exit /b 0

:fail
echo.
echo Publish failed - see the messages above.
exit /b 1
