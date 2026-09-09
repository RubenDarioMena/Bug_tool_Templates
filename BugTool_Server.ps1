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
    $reader = $null
    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()
      while (($line = $reader.ReadLine()) -ne $null -and $line -ne "") { }

      $parts = @($requestLine -split " ")
      $method = if ($parts.Count -gt 0) { $parts[0].ToUpperInvariant() } else { "" }
      $path = if ($parts.Count -gt 1) { ($parts[1] -split "\?", 2)[0] } else { "" }

      if ($method -ne "GET" -and $method -ne "HEAD") {
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
      if ($reader) { $reader.Dispose() }
      if ($stream) { $stream.Dispose() }
      $client.Dispose()
    }
  }
} finally {
  $listener.Stop()
}
