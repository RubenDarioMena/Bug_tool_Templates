param(
  [ValidateRange(1, 65535)][int]$Port = 8765,
  [switch]$NoBrowser
)

# Servidor local minimo para Bug Tool. Compatible con Windows PowerShell 5.1.
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$files = @{
  "/" = "bug_tool_multilanguage.html"
  "/bug_tool_multilanguage.html" = "bug_tool_multilanguage.html"
  "/bug_data.csv" = "bug_data.csv"
  "/bug_fields.csv" = "bug_fields.csv"
  "/bug_rules.csv" = "bug_rules.csv"
}

function Send-Response {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$Status,
    [string]$Reason,
    [byte[]]$Body,
    [string]$ContentType,
    [bool]$HeadOnly = $false
  )

  $headers = "HTTP/1.1 $Status $Reason`r`n" +
    "Content-Type: $ContentType`r`n" +
    "Content-Length: $($Body.Length)`r`n" +
    "Cache-Control: no-store`r`n" +
    "Connection: close`r`n`r`n"
  [byte[]]$headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if (-not $HeadOnly -and $Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
}

# Read bytes directly: StreamReader buffers can consume bytes from an upload.
function Read-Request {
  param([System.Net.Sockets.NetworkStream]$Stream)
  $header = [System.Collections.Generic.List[byte]]::new()
  while ($true) {
    $next = $Stream.ReadByte()
    if ($next -lt 0) { throw "Incomplete request" }
    $header.Add([byte]$next)
    $count = $header.Count
    if ($count -ge 4 -and $header[$count-4] -eq 13 -and $header[$count-3] -eq 10 -and
        $header[$count-2] -eq 13 -and $header[$count-1] -eq 10) { break }
    if ($count -gt 16384) { throw "Request headers too large" }
  }
  $lines = [System.Text.Encoding]::ASCII.GetString($header.ToArray()) -split "`r`n"
  $parts = @($lines[0] -split " ")
  $headers = @{}
  foreach ($line in $lines | Select-Object -Skip 1) {
    if ($line.Contains(":")) {
      $pair = $line -split ":", 2
      $key = $pair[0].Trim().ToLowerInvariant()
      if ($headers.ContainsKey($key)) { throw "Duplicate header" }
      $headers[$key] = $pair[1].Trim()
    }
  }
  return @{
    Method = if ($parts.Count -gt 0) { $parts[0].ToUpperInvariant() } else { "" }
    Path = if ($parts.Count -gt 1) { ($parts[1] -split "\?", 2)[0] } else { "" }
    Headers = $headers
  }
}

function Send-Json {
  param($Stream, [int]$Status, [string]$Reason, $Value)
  [byte[]]$body = [System.Text.Encoding]::UTF8.GetBytes(($Value | ConvertTo-Json -Depth 8 -Compress))
  Send-Response $Stream $Status $Reason $body "application/json; charset=utf-8"
}

function Save-Issue {
  param($Report)
  if ($Report.name -isnot [string] -or $Report.name.Length -gt 200 -or
      $Report.description -isnot [string] -or [string]::IsNullOrWhiteSpace($Report.description) -or
      $Report.description.Length -gt 20000 -or $Report.media -isnot [array]) {
    throw [System.ArgumentException]::new("Invalid report")
  }
  $media = @($Report.media)
  if ($media.Count -gt 20) { throw [System.ArgumentException]::new("Too many files") }
  $decoded = [System.Collections.Generic.List[object]]::new()
  [long]$total = 0
  $index = 0
  foreach ($file in $media) {
    if ($file.name -isnot [string] -or $file.name.Length -gt 240 -or
        $file.name -notmatch '\.(png|jpe?g|gif|webp|bmp|tiff?|heic|heif|avif|svg|ico|mp4|mov|webm|avi|mkv|m4v|mpeg|mpg|wmv|3gp|ogv)$' -or
        $file.type -isnot [string] -or ($file.type -ne "" -and $file.type -notmatch '^(image|video)/') -or
        $file.data -isnot [string]) {
      throw [System.ArgumentException]::new("Invalid media")
    }
    [byte[]]$bytes = [System.Convert]::FromBase64String($file.data)
    $total += $bytes.Length
    if ($total -gt 40MB) { throw [System.ArgumentException]::new("Media limit exceeded") }
    # Prefix prevents duplicate/reserved Windows names; remove path separators.
    $index++
    $safeName = ($file.name -replace '[<>:"/\\|?*\x00-\x1f]', '_').TrimEnd([char[]]". ")
    $safeName = $index.ToString("00") + "_" + $safeName
    $decoded.Add(@{ Name = $safeName; OriginalName = $file.name; Type = $file.type; Bytes = $bytes })
  }
  $issues = [System.IO.Path]::Combine($root, "Issues")
  [void][System.IO.Directory]::CreateDirectory($issues)
  $staging = [System.IO.Path]::Combine($issues, ".pending-" + [guid]::NewGuid().ToString("N"))
  [void][System.IO.Directory]::CreateDirectory($staging)
  try {
    $created = Get-Date
    $manifest = @{
      createdAt = $created.ToString("o")
      name = $Report.name.Trim()
      description = $Report.description.Trim()
      media = @($decoded | ForEach-Object { @{ file = $_.Name; originalName = $_.OriginalName; type = $_.Type; size = $_.Bytes.Length } })
    }
    $utf8 = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText([System.IO.Path]::Combine($staging, "report.json"),
      ($manifest | ConvertTo-Json -Depth 8), $utf8)
    [System.IO.File]::WriteAllText([System.IO.Path]::Combine($staging, "report.txt"),
      "Date: $($manifest.createdAt)`r`nName / desk: $($manifest.name)`r`n`r`n$($manifest.description)`r`n", $utf8)
    foreach ($file in $decoded) {
      [System.IO.File]::WriteAllBytes([System.IO.Path]::Combine($staging, $file.Name), $file.Bytes)
    }
    # Windows cannot use ':' in a directory name. Move is atomic and never overwrites.
    $prefix = $created.ToString("MM-dd-yy_HH-mm-ss", [System.Globalization.CultureInfo]::InvariantCulture)
    for ($sequence = 1; $sequence -le 99999; $sequence++) {
      $folder = $prefix + "_" + $sequence.ToString("00")
      $destination = [System.IO.Path]::Combine($issues, $folder)
      try {
        [System.IO.Directory]::Move($staging, $destination)
        return $folder
      } catch [System.IO.IOException] {
        if (-not [System.IO.Directory]::Exists($destination)) { throw }
      }
    }
    throw "No available issue identifier"
  } finally {
    if ([System.IO.Directory]::Exists($staging)) { [System.IO.Directory]::Delete($staging, $true) }
  }
}

function Receive-Issue {
  param($Stream, $Request)
  $headers = $Request.Headers
  # Only the local page may write files. JSON + exact Origin blocks browser cross-site posts.
  $allowedHosts = @("127.0.0.1:$Port", "localhost:$Port")
  if ($headers.host -notin $allowedHosts -or $headers.origin -ne "http://$($headers.host)" -or
      $headers['content-type'] -notmatch '^application/json(?:\s*;|$)') {
    Send-Json $Stream 403 "Forbidden" @{ error = "Local origin required" }
    return
  }
  [long]$length = 0
  if ($headers.ContainsKey('transfer-encoding') -or
      -not [long]::TryParse($headers['content-length'], [ref]$length) -or $length -le 0) {
    Send-Json $Stream 400 "Bad Request" @{ error = "Content-Length required" }
    return
  }
  if ($length -gt 64MB) {
    Send-Json $Stream 413 "Payload Too Large" @{ error = "Upload too large" }
    return
  }
  [byte[]]$body = New-Object byte[] ([int]$length)
  $offset = 0
  while ($offset -lt $length) {
    $read = $Stream.Read($body, $offset, [int]$length - $offset)
    if ($read -eq 0) { throw "Incomplete upload" }
    $offset += $read
  }
  try {
    $report = [System.Text.Encoding]::UTF8.GetString($body) | ConvertFrom-Json -ErrorAction Stop
  } catch {
    Send-Json $Stream 400 "Bad Request" @{ error = "Invalid JSON" }
    return
  }
  try {
    $folder = Save-Issue $report
  } catch [System.ArgumentException] {
    Send-Json $Stream 400 "Bad Request" @{ error = "Invalid report or media" }
    return
  } catch [System.FormatException] {
    Send-Json $Stream 400 "Bad Request" @{ error = "Invalid media encoding" }
    return
  }
  Send-Json $Stream 201 "Created" @{ folder = $folder }
}

$missing = @($files.Values | Sort-Object -Unique | Where-Object {
  -not [System.IO.File]::Exists([System.IO.Path]::Combine($root, $_))
})
if ($missing.Count -gt 0) {
  Write-Host "No se puede iniciar Bug Tool. Faltan: $($missing -join ', ')" -ForegroundColor Red
  exit 1
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try {
  $listener.Start()
} catch {
  Write-Host "No se pudo usar el puerto $Port. Prueba: .\BugTool_Server.ps1 -Port 8766" -ForegroundColor Red
  exit 1
}

$url = "http://127.0.0.1:$Port/"
Write-Host "Bug Tool esta disponible en $url" -ForegroundColor Green
Write-Host "Deja esta ventana abierta. Ctrl+C detiene el servidor."
if (-not $NoBrowser) { Start-Process $url }

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    $stream = $null
    try {
      $stream = $client.GetStream()
      $client.ReceiveTimeout = 30000
      $client.SendTimeout = 30000
      $request = Read-Request $stream
      $method = $request.Method
      $path = $request.Path

      if ($method -eq "POST" -and $path -eq "/api/issues") {
        Receive-Issue $stream $request
      } elseif ($method -ne "GET" -and $method -ne "HEAD") {
        [byte[]]$body = [System.Text.Encoding]::UTF8.GetBytes("Method not allowed")
        Send-Response $stream 405 "Method Not Allowed" $body "text/plain; charset=utf-8"
      } elseif (-not $files.ContainsKey($path)) {
        [byte[]]$body = [System.Text.Encoding]::UTF8.GetBytes("Not found")
        Send-Response $stream 404 "Not Found" $body "text/plain; charset=utf-8" ($method -eq "HEAD")
      } else {
        $name = $files[$path]
        $filePath = [System.IO.Path]::Combine($root, $name)
        [byte[]]$body = [System.IO.File]::ReadAllBytes($filePath)
        $type = if ([System.IO.Path]::GetExtension($name) -eq ".csv") {
          "text/csv; charset=utf-8"
        } else {
          "text/html; charset=utf-8"
        }
        Send-Response $stream 200 "OK" $body $type ($method -eq "HEAD")
      }
    } catch {
      Write-Warning $_.Exception.Message
      if ($stream) {
        try {
          [byte[]]$body = [System.Text.Encoding]::UTF8.GetBytes("Internal server error")
          Send-Response $stream 500 "Internal Server Error" $body "text/plain; charset=utf-8"
        } catch { }
      }
    } finally {
      if ($stream) { $stream.Dispose() }
      $client.Dispose()
    }
  }
} finally {
  $listener.Stop()
}
