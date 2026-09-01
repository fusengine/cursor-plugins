# fusengine-plugins (Cursor) — installer for Windows.
#
# Same contract as install.sh:
#   A. the marketplace  -> symlinked into %USERPROFILE%\.cursor\plugins\local\
#   B. the global rule  -> COPIED to %USERPROFILE%\.cursor\rules\fuse-global.mdc
# Writes nothing inside the repository, elevates nothing, and removes nothing
# but its own link and its own fuse-prefixed rule file.
#
# Usage:
#   .\install.ps1              install (idempotent)
#   .\install.ps1 -DryRun      show what would happen, write nothing
#   .\install.ps1 -Force       overwrite a global rule edited by hand
#   .\install.ps1 -Uninstall   remove the link and the fuse-global.mdc rule
#
# Note: creating a symlink on Windows needs Developer Mode or an elevated shell.
# When it is refused, the script falls back to a directory junction, which needs
# neither. Verification lives in verify.sh (run it from Git Bash or WSL).

param(
    [switch]$DryRun,
    [switch]$Uninstall,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$Root      = Split-Path -Parent $MyInvocation.MyCommand.Path
$LinkName  = "fusengine"
$LocalDir  = Join-Path $env:USERPROFILE ".cursor\plugins\local"
$Link      = Join-Path $LocalDir $LinkName
$Manifest  = Join-Path $Root ".cursor-plugin\marketplace.json"

$RuleName  = "fuse-global.mdc"
$RuleSrc   = Join-Path $Root "fuse-rules\user-rules\$RuleName"
$RulesDir  = Join-Path $env:USERPROFILE ".cursor\rules"
$RuleDst   = Join-Path $RulesDir $RuleName

function Step($m) { Write-Host "`n== $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "   ok    $m" }
function Warn($m) { Write-Host "   warn  $m" -ForegroundColor Yellow }
function Plan($m) { Write-Host "   would $m" }
function Die($m)  { Write-Host "   error $m" -ForegroundColor Red; exit 1 }

# --- repo identity -----------------------------------------------------------
if (-not (Test-Path $Manifest)) { Die "not a Cursor marketplace root: $Manifest is missing" }
# Hard collision guard: only fuse-prefixed rule files may ever be deployed.
if (-not $RuleName.StartsWith("fuse-")) { Die "refusing to deploy a rule file without the 'fuse-' prefix: $RuleName" }

function Get-LinkTarget($p) {
    $i = Get-Item $p -Force -ErrorAction SilentlyContinue
    if ($null -eq $i) { return $null }
    if ($i.LinkType) { return $i.Target | Select-Object -First 1 }
    return $null
}

# --- uninstall ---------------------------------------------------------------
if ($Uninstall) {
    Step "Uninstall — $Link"
    $t = Get-LinkTarget $Link
    if ($t) {
        if ($DryRun) { Plan "remove the link $Link (its target is never touched)" }
        else { (Get-Item $Link -Force).Delete(); Ok "link removed. The repository itself was not touched." }
    } elseif (Test-Path $Link) {
        Die "$Link exists but is not a link. Refusing to delete a real directory."
    } else { Ok "nothing to do — $Link does not exist." }

    Step "Uninstall — $RuleDst"
    if (-not (Test-Path $RuleDst)) { Ok "nothing to do — $RuleDst does not exist." }
    else {
        $same = (Test-Path $RuleSrc) -and -not (Compare-Object (Get-Content $RuleSrc) (Get-Content $RuleDst))
        if ($same -or $Force) {
            if ($DryRun) { Plan "Remove-Item `"$RuleDst`" (this file only)" }
            else { Remove-Item $RuleDst; Ok "removed $RuleDst" }
        } else {
            Warn "$RuleDst differs from the repo copy — it may have been edited by hand. Kept."
            Warn "Re-run with -Uninstall -Force to remove it anyway."
        }
    }
    Write-Host "`nRestart Cursor or run 'Developer: Reload Window' for the removal to be seen."
    exit 0
}

# --- 1. prerequisites --------------------------------------------------------
Step "1/5  Prerequisites"
$cursorExe = Join-Path $env:LOCALAPPDATA "Programs\cursor\Cursor.exe"
if (Test-Path $cursorExe) { Ok "Cursor found at $cursorExe" } else { Warn "Cursor.exe not found at $cursorExe — install path may differ." }
foreach ($bin in @("node", "npx")) {
    if (Get-Command $bin -ErrorAction SilentlyContinue) { Ok "$bin found" }
    else { Die "$bin not on PATH — every hook runs 'npx -y @fusengine/harness hook cursor' and would fail." }
}

# --- 2. link the marketplace -------------------------------------------------
Step "2/5  Link the marketplace into $LocalDir"
if (Test-Path $LocalDir) { Ok "$LocalDir exists" }
elseif ($DryRun) { Plan "create $LocalDir" }
else { New-Item -ItemType Directory -Path $LocalDir -Force | Out-Null; Ok "created $LocalDir" }

$target = Get-LinkTarget $Link
if ($target -and ($target.TrimEnd('\') -eq $Root.TrimEnd('\'))) {
    Ok "already linked to this checkout — nothing to do (idempotent)."
} elseif ($target) {
    Warn "existing link points elsewhere: $target"
    if ($DryRun) { Plan "replace the link so it points at $Root" }
    else { (Get-Item $Link -Force).Delete(); New-Item -ItemType SymbolicLink -Path $Link -Target $Root -ErrorAction SilentlyContinue | Out-Null
           if (-not (Test-Path $Link)) { New-Item -ItemType Junction -Path $Link -Target $Root | Out-Null; Ok "re-pointed (junction)" } else { Ok "re-pointed (symlink)" } }
} elseif (Test-Path $Link) {
    Die "$Link exists and is a real directory, not a link. Refusing to touch it. Move it aside and re-run."
} else {
    if ($DryRun) { Plan "link $Link -> $Root" }
    else {
        New-Item -ItemType SymbolicLink -Path $Link -Target $Root -ErrorAction SilentlyContinue | Out-Null
        if (-not (Test-Path $Link)) {
            Warn "symlink refused (Developer Mode off?) — falling back to a directory junction."
            New-Item -ItemType Junction -Path $Link -Target $Root | Out-Null
        }
        Ok "linked $Link -> $Root"
    }
}

# --- 3. detect a competing installation --------------------------------------
Step "3/5  Other installations in $LocalDir"
$dupes = @()
if (Test-Path $LocalDir) {
    Get-ChildItem $LocalDir -Force | Where-Object { $_.Name -ne $LinkName } | ForEach-Object {
        $m = Join-Path $_.FullName ".cursor-plugin\marketplace.json"
        if (Test-Path $m) { $dupes += $_.Name }
    }
}
if ($dupes.Count -gt 0) {
    foreach ($d in $dupes) { Warn "duplicate marketplace entry: $d" }
    Warn "Cursor may list every plugin twice. Remove the one you do not want — this script only ever removes '$LinkName'."
} else { Ok "no competing installation found." }

# --- 4. global user rule -----------------------------------------------------
# Copied, not linked: the rules scanner has never been observed following a link.
# Consequence: edit the repo file, then re-run this script.
Step "4/5  Global user rule -> $RuleDst"
if (-not (Test-Path $RuleSrc)) {
    Warn "source not present: $RuleSrc"
    Warn "Skipping it — the marketplace install above is complete and valid on its own."
} else {
    if (Test-Path $RulesDir) { Ok "$RulesDir exists" }
    elseif ($DryRun) { Plan "create $RulesDir" }
    else { New-Item -ItemType Directory -Path $RulesDir -Force | Out-Null; Ok "created $RulesDir" }

    if ((Test-Path $RuleDst) -and -not (Compare-Object (Get-Content $RuleSrc) (Get-Content $RuleDst))) {
        Ok "already up to date — nothing to do."
    } elseif ((Test-Path $RuleDst) -and -not $Force) {
        Warn "$RuleDst already exists and DIFFERS from the repo copy:"
        Warn ("   installed: {0} bytes, modified {1}" -f (Get-Item $RuleDst).Length, (Get-Item $RuleDst).LastWriteTime)
        Warn ("   repo:      {0} bytes, modified {1}" -f (Get-Item $RuleSrc).Length, (Get-Item $RuleSrc).LastWriteTime)
        Warn "A global rule is a file you may have edited by hand — not overwriting it. Re-run with -Force."
    } elseif ($DryRun) {
        Plan "copy $RuleSrc -> $RuleDst"
    } else {
        Copy-Item $RuleSrc $RuleDst -Force
        Ok "copied $RuleName into $RulesDir"
    }
}

# --- 5. what this script cannot do -------------------------------------------
Step "5/5  Manual steps left to you"
Write-Host "   1. In Cursor: Command Palette -> 'Developer: Reload Window'."
Write-Host "   2. Cursor Settings -> Plugins (Customize): the 24 plugins must appear."
Write-Host "   3. Cursor Settings -> Rules: 'fuse-global' must be listed and marked Always."
Write-Host "   4. Hooks run 'npx -y @fusengine/harness hook cursor'; the first run downloads the package."
Write-Host ""
if ($DryRun) { Write-Host "Dry run — nothing was written." } else { Write-Host "Installed. Run ./verify.sh (Git Bash or WSL) to prove it." }
