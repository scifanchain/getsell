# Simple unzip wrapper for PowerShell
param(
    [Parameter(Mandatory=$true)]
    [string]$zipFile
)

$destination = Split-Path -Parent $zipFile
Expand-Archive -Path $zipFile -DestinationPath $destination -Force
