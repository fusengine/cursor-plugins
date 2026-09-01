# Install globally by default, or into one explicit Cursor project.
# Usage: .\install.ps1 [-Project <path>] [-DryRun] [-Uninstall]
param(
    [string]$Project,
    [switch]$DryRun,
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "node is required because Cursor hooks and the installer use it"
}

$Arguments = @((Join-Path $Root ".cursor-plugin/scripts/install.mjs"))
if ($Project) { $Arguments += @("--project", $Project) }
if ($DryRun) { $Arguments += "--dry-run" }
if ($Uninstall) { $Arguments += "--uninstall" }
& node @Arguments
exit $LASTEXITCODE
