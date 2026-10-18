# Reference script (docs/knowledge/bds-local-server/README.md). Not part of the Add-On or of pnpm tooling.
#
# Runs bedrock_server.exe with its console redirected, so that an external tool can
#   - read everything BDS prints (including script console.* lines) from  <WorkDir>\stdout.log
#   - send console commands by appending lines to                        <WorkDir>\stdin.txt
# Text is UTF-8 in both directions. Stop the server by appending "stop" to stdin.txt.
#
# Usage (Windows PowerShell 5.1, same account that normally runs BDS):
#   powershell -NoProfile -ExecutionPolicy Bypass -File bds-console-bridge.ps1 -ServerDir C:\MinecraftServer
param(
  [string]$ServerDir = 'C:\MinecraftServer',
  [string]$WorkDir = (Join-Path $ServerDir 'bo-bridge')
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null
$logPath = Join-Path $WorkDir 'stdout.log'
$cmdPath = Join-Path $WorkDir 'stdin.txt'
$utf8 = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText($cmdPath, '', $utf8)

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = Join-Path $ServerDir 'bedrock_server.exe'
$psi.WorkingDirectory = $ServerDir
$psi.UseShellExecute = $false
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.StandardOutputEncoding = $utf8
$psi.StandardErrorEncoding = $utf8
$proc = [System.Diagnostics.Process]::Start($psi)

# .NET Framework has no StandardInputEncoding: write UTF-8 bytes to the base stream ourselves.
$stdin = New-Object System.IO.StreamWriter($proc.StandardInput.BaseStream, $utf8)
$stdin.AutoFlush = $true
$log = New-Object System.IO.StreamWriter($logPath, $true, $utf8)
$log.AutoFlush = $true
$log.WriteLine("# bridge started $(Get-Date -Format o) pid $($proc.Id)")

$outTask = $proc.StandardOutput.ReadLineAsync()
$errTask = $proc.StandardError.ReadLineAsync()
$sent = 0

function Drain([ref]$task, $reader, [string]$tag) {
  while ($task.Value -ne $null -and $task.Value.IsCompleted) {
    $line = $task.Value.Result
    if ($line -eq $null) { $task.Value = $null; return }
    $log.WriteLine($tag + $line)
    $task.Value = $reader.ReadLineAsync()
  }
}

while (-not $proc.HasExited) {
  Drain ([ref]$outTask) $proc.StandardOutput ''
  Drain ([ref]$errTask) $proc.StandardError '[stderr] '
  try {
    $lines = [IO.File]::ReadAllLines($cmdPath, $utf8)
    for ($i = $sent; $i -lt $lines.Length; $i++) {
      $stdin.WriteLine($lines[$i])
      $log.WriteLine("# sent $(Get-Date -Format o): $($lines[$i])")
    }
    $sent = $lines.Length
  } catch [System.IO.IOException] {
    # The tool is writing the file right now; try again on the next pass.
  }
  Start-Sleep -Milliseconds 100
}

Drain ([ref]$outTask) $proc.StandardOutput ''
Drain ([ref]$errTask) $proc.StandardError '[stderr] '
$log.WriteLine("# bridge stopped $(Get-Date -Format o) exit $($proc.ExitCode)")
$log.Close()
