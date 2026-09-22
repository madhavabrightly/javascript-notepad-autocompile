# Splits the built portable exe into fixed-size chunks for git.
# GitHub rejects files over 100 MB, so the ~84 MB exe is uploaded as 20 MB parts.
param(
  [string]$Source = "dist\JavaScript Notepad 1.0.0.exe",
  [string]$OutDir = "release",
  [int]$ChunkMB = 20
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Source)) {
  throw "Build the app first with 'npm run build'. Missing: $Source"
}

if (Test-Path $OutDir) {
  Remove-Item $OutDir -Recurse -Force
}
New-Item -ItemType Directory -Path $OutDir | Out-Null

$chunkSize = $ChunkMB * 1MB
$buffer = New-Object byte[] $chunkSize
$input = [System.IO.File]::OpenRead((Resolve-Path $Source))
$index = 1

try {
  while ($true) {
    $read = $input.Read($buffer, 0, $chunkSize)
    if ($read -le 0) { break }

    $name = "{0}.part-{1:d3}" -f (Split-Path $Source -Leaf), $index
    $path = Join-Path $OutDir $name
    $stream = [System.IO.File]::Create($path)
    try {
      $stream.Write($buffer, 0, $read)
    } finally {
      $stream.Dispose()
    }
    Write-Host ("wrote {0} ({1:N1} MB)" -f $name, ($read / 1MB))
    $index++
  }
} finally {
  $input.Dispose()
}

Write-Host ("done: {0} chunk(s) in {1}" -f ($index - 1), $OutDir)
