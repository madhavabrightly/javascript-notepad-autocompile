# Rebuilds the portable exe from the chunked parts committed under release/.
param(
  [string]$PartsDir = "release",
  [string]$Output = "JavaScript Notepad 1.0.0.exe"
)

$ErrorActionPreference = "Stop"

$parts = Get-ChildItem -Path $PartsDir -Filter "*.part-*" | Sort-Object Name
if (-not $parts) {
  throw "No chunks found in $PartsDir"
}

if (Test-Path $Output) {
  Remove-Item $Output -Force
}

$out = [System.IO.File]::Create((Join-Path (Get-Location) $Output))
try {
  foreach ($part in $parts) {
    $bytes = [System.IO.File]::ReadAllBytes($part.FullName)
    $out.Write($bytes, 0, $bytes.Length)
    Write-Host ("appended {0}" -f $part.Name)
  }
} finally {
  $out.Dispose()
}

Write-Host ("done: {0}" -f $Output)
