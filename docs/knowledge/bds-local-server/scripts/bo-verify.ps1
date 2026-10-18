# Reference script (docs/knowledge/bds-local-server/README.md). Not part of the Add-On or of pnpm tooling.
#
# Thin verification wrapper around bds-console-bridge.ps1: runs the steps of a cases file one by one,
# waits for each response (matched by requestId), judges it, and writes the verdicts as JSON.
#
# Cases file (UTF-8 JSON): { "steps": [ <step>, ... ] }
#   console step: { "console": "scoreboard objectives add ...", "waitMs": 500 }   (test setup/cleanup only)
#   request step: { "id": "ENT-01", "method": "entity", "params": { ... }, "expect": { ... } }
#     expect.ok      true/false (default true)
#     expect.code    error code, for expect.ok = false
#     expect.has     paths that must exist, e.g. "data.effects.0.typeId"
#     expect.equals  { path: value }
#     expect.atLeast { path: number }
#   A params string "$ref:<step id>:<path>" is replaced by that value of an earlier response.
#
# Usage (Windows PowerShell 5.1, while the bridge is running):
#   powershell -NoProfile -ExecutionPolicy Bypass -File bo-verify.ps1 -Cases bo-verify-cases.json
param(
  [Parameter(Mandatory = $true)][string]$Cases,
  [string]$WorkDir = 'C:\MinecraftServer\bo-bridge',
  [string]$Out = (Join-Path $WorkDir ("verdicts-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + ".json")),
  [int]$TimeoutMs = 5000
)

$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$logPath = Join-Path $WorkDir 'stdout.log'
$cmdPath = Join-Path $WorkDir 'stdin.txt'
$prefix = 'to3izo_bo.response '
$run = [Guid]::NewGuid().ToString('N').Substring(0, 6)
$steps = ([IO.File]::ReadAllText((Resolve-Path $Cases), $utf8) | ConvertFrom-Json).steps
$responses = @{}
$offset = (Get-Item $logPath).Length

function Send-Line([string]$line) {
  [IO.File]::AppendAllText($cmdPath, $line + "`r`n", $utf8)
}

# The request must be ASCII (BDS reads stdin as CP932): escape everything else as \uXXXX.
function ConvertTo-AsciiJson($value) {
  $json = ConvertTo-Json $value -Depth 20 -Compress
  [regex]::Replace($json, '[^\x00-\x7f]', { param($m) '\u{0:x4}' -f [int][char]$m.Value })
}

function Get-PathValue($object, [string]$path) {
  $current = $object
  foreach ($part in $path.Split('.')) {
    if ($null -eq $current) { return @{ found = $false } }
    if ($current -is [array]) {
      if ($part -notmatch '^\d+$' -or [int]$part -ge $current.Count) { return @{ found = $false } }
      $current = $current[[int]$part]
      continue
    }
    $property = $current.PSObject.Properties[$part]
    if ($null -eq $property) { return @{ found = $false } }
    $current = $property.Value
  }
  return @{ found = $true; value = $current }
}

# A member of a parsed JSON object, or $null. (`$o.equals` would find the .NET Equals method when the key is absent.)
function Get-Field($object, [string]$name) {
  if ($null -eq $object) { return $null }
  $property = $object.PSObject.Properties[$name]
  if ($property -and $property.MemberType -eq 'NoteProperty') { return $property.Value }
  return $null
}

function Resolve-Refs([string]$json) {
  [regex]::Replace($json, '"\$ref:([^:"]+):([^"]+)"', {
      param($m)
      $source = $responses[$m.Groups[1].Value]
      $hit = if ($source) { Get-PathValue $source $m.Groups[2].Value } else { @{ found = $false } }
      if (-not $hit.found) { throw "unresolved reference $($m.Value)" }
      ConvertTo-Json $hit.value -Depth 20 -Compress
    })
}

# Reads the log from where this run started and returns the response line for a requestId, if it is there.
function Find-Response([string]$requestId) {
  $fs = [IO.File]::Open($logPath, 'Open', 'Read', 'ReadWrite')
  try {
    [void]$fs.Seek($offset, 'Begin')
    $text = (New-Object System.IO.StreamReader($fs, $utf8)).ReadToEnd()
  } finally { $fs.Close() }
  $needle = '"requestId":"' + $requestId + '"'
  foreach ($line in ($text -split "`r?`n")) {
    $at = $line.IndexOf($prefix)
    if ($at -ge 0 -and $line.Contains($needle)) { return $line.Substring($at + $prefix.Length) }
  }
  return $null
}

$verdicts = @()
foreach ($step in $steps) {
  $console = Get-Field $step 'console'
  if ($console) {
    Send-Line $console
    $waitMs = Get-Field $step 'waitMs'
    $wait = if ($waitMs) { [int]$waitMs } else { 300 }
    Start-Sleep -Milliseconds $wait
    continue
  }

  $requestId = "v$run-$($step.id)"
  $problems = @()
  $envelope = $null
  try {
    $request = [ordered]@{ requestId = $requestId; method = $step.method }
    $params = Get-Field $step 'params'
    if ($null -ne $params) { $request.params = $params }
    Send-Line ('scriptevent to3izo_bo:query ' + (Resolve-Refs (ConvertTo-AsciiJson $request)))
    $deadline = (Get-Date).AddMilliseconds($TimeoutMs)
    $line = $null
    while (-not $line -and (Get-Date) -lt $deadline) {
      Start-Sleep -Milliseconds 150
      $line = Find-Response $requestId
    }
    if (-not $line) { $problems += "no response within $TimeoutMs ms" }
    else {
      $envelope = $line | ConvertFrom-Json
      $responses[$step.id] = $envelope
    }
  } catch { $problems += "failed to run: $($_.Exception.Message)" }

  if ($envelope) {
    $expect = Get-Field $step 'expect'
    $okField = Get-Field $expect 'ok'
    $code = Get-Field $expect 'code'
    $equals = Get-Field $expect 'equals'
    $atLeast = Get-Field $expect 'atLeast'
    $wantOk = if ($null -ne $okField) { [bool]$okField } else { $true }
    $gotCode = (Get-PathValue $envelope 'error.code').value
    if ($envelope.ok -ne $wantOk) { $problems += "ok was $($envelope.ok) ($gotCode), expected $wantOk" }
    if ($code -and $gotCode -ne $code) { $problems += "code was $gotCode, expected $code" }
    foreach ($path in @(Get-Field $expect 'has')) {
      if ($path -and -not (Get-PathValue $envelope $path).found) { $problems += "missing $path" }
    }
    if ($equals) {
      foreach ($p in $equals.PSObject.Properties) {
        $hit = Get-PathValue $envelope $p.Name
        $got = if ($hit.found) { ConvertTo-Json $hit.value -Depth 20 -Compress } else { '(missing)' }
        $want = ConvertTo-Json $p.Value -Depth 20 -Compress
        if ($got -ne $want) { $problems += "$($p.Name) was $got, expected $want" }
      }
    }
    if ($atLeast) {
      foreach ($p in $atLeast.PSObject.Properties) {
        $hit = Get-PathValue $envelope $p.Name
        if (-not $hit.found -or [double]$hit.value -lt [double]$p.Value) { $problems += "$($p.Name) was below $($p.Value)" }
      }
    }
  }

  $pass = $problems.Count -eq 0
  $verdicts += [ordered]@{ id = $step.id; method = $step.method; pass = $pass; problems = $problems; response = $envelope }
  Write-Output ('{0} {1,-10} {2}' -f $(if ($pass) { 'PASS' } else { 'FAIL' }), $step.id, ($problems -join '; '))
}

$failed = @($verdicts | Where-Object { -not $_.pass }).Count
$report = [ordered]@{ run = $run; finishedAt = (Get-Date -Format o); cases = $Cases; passed = $verdicts.Count - $failed; failed = $failed; verdicts = $verdicts }
[IO.File]::WriteAllText($Out, (ConvertTo-Json $report -Depth 30), $utf8)
Write-Output "passed $($verdicts.Count - $failed), failed $failed -> $Out"
