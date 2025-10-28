Param(
  [Parameter(Mandatory=$false)][string]$Source = "C:\Users\Igerasim\OneDrive - Acushnet Company\Desktop\Iron heads models",
  [Parameter(Mandatory=$false)][string]$Target = (Join-Path (Get-Location) "assets/img/iron-heads")
)
New-Item -ItemType Directory -Path $Target -Force | Out-Null
$exts = @('*.jpg','*.jpeg','*.png','*.webp','*.gif')
$files = @()
foreach ($e in $exts) { $files += Get-ChildItem -Path $Source -Recurse -File -Include $e }

Add-Type -AssemblyName System.Drawing -ErrorAction SilentlyContinue | Out-Null

$images = @()
foreach ($f in $files) {
  $dest = Join-Path $Target $f.Name
  Copy-Item -Path $f.FullName -Destination $dest -Force
  $rel = "assets/img/iron-heads/" + $f.Name
  $alt = [System.IO.Path]::GetFileNameWithoutExtension($f.Name) -replace '_',' ' -replace '-',' '

  # Try EXIF DateTaken (PropertyId 36867) or DateDigitized (36868)
  $date = $null
  try {
    $img = [System.Drawing.Image]::FromFile($dest)
    $propTaken = $img.PropertyItems | Where-Object { $_.Id -eq 36867 }
    if ($propTaken) {
      $raw = [System.Text.Encoding]::ASCII.GetString($propTaken.Value).Trim([char]0)
      # Format like "2021:03:14 10:20:30"
      $date = [datetime]::ParseExact($raw, 'yyyy:MM:dd HH:mm:ss', $null)
    } else {
      $propDig = $img.PropertyItems | Where-Object { $_.Id -eq 36868 }
      if ($propDig) {
        $raw = [System.Text.Encoding]::ASCII.GetString($propDig.Value).Trim([char]0)
        $date = [datetime]::ParseExact($raw, 'yyyy:MM:dd HH:mm:ss', $null)
      }
    }
    $img.Dispose()
  } catch { }

  if (-not $date) { $date = $f.LastWriteTimeUtc }
  $year = $date.Year

  $images += [pscustomobject]@{ src=$rel; alt=$alt; year=$year; date=$date.ToString('o') }
}

$images | Sort-Object year, date, src | ConvertTo-Json -Depth 5 | Out-File (Join-Path $Target 'images.json') -Encoding UTF8
Write-Host "Imported $($files.Count) images to $Target and wrote images.json with year/date metadata."
