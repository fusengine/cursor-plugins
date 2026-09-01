# Install the Fusengine plugin suite for Cursor.
#
# install-hooks.ts is the single entry point: it spawns the matching deployment
# engine (global by default, project-local with -Project) and then runs the
# configuration stage - hooks.json, .env, mcp.json, AGENTS.md, shell loaders,
# vendored harness.
#
# Usage: .\install.ps1 [-Project <path>] [-DryRun] [-Uninstall] [-SkipEnv]
param(
    [string]$Project,
    [switch]$DryRun,
    [switch]$Uninstall,
    [switch]$SkipEnv
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    throw "bun is required to run the installer. Install it with: powershell -c ""irm bun.sh/install.ps1 | iex"""
}

$Arguments = @((Join-Path $Root ".cursor-plugin/scripts/install-hooks.ts"))
if ($Project) { $Arguments += @("--project", $Project) }
if ($DryRun) { $Arguments += "--dry-run" }
if ($Uninstall) { $Arguments += "--uninstall" }
if ($SkipEnv) { $Arguments += "--skip-env" }

& bun @Arguments
exit $LASTEXITCODE
