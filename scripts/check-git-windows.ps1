[CmdletBinding()]
param(
  [switch]$InstallGit,
  [switch]$ConfigureGit
)

$ErrorActionPreference = "Stop"

function Find-Git {
  $command = Get-Command git -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  $candidates = @(
    (Join-Path $env:ProgramFiles "Git\cmd\git.exe"),
    (Join-Path $env:ProgramFiles "Git\bin\git.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\Git\cmd\git.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\Git\bin\git.exe")
  ) | Where-Object { $_ -and (Test-Path $_) }

  if ($candidates) { return $candidates[0] }
  return $null
}

$gitPath = Find-Git

if (-not $gitPath -and $InstallGit) {
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) {
    Write-Error "未找到 Git，也未找到 winget。请从 https://git-scm.com/install/windows 下载 Git for Windows 后重新运行本脚本。"
    exit 1
  }

  Write-Host "正在通过 Windows Package Manager 安装 Git for Windows..."
  & $winget.Source install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) {
    Write-Error "winget 安装 Git 失败，退出码：$LASTEXITCODE"
    exit $LASTEXITCODE
  }

  # Refresh this PowerShell process PATH so the newly installed Git can be detected.
  $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machinePath;$userPath"
  $gitPath = Find-Git
}

if (-not $gitPath) {
  Write-Host "未检测到 Git for Windows。"
  Write-Host "官方下载：https://git-scm.com/install/windows"
  Write-Host "安装时请选择：Git from the command line and also from 3rd-party software。"
  Write-Host "安装完成后关闭并重新打开 PowerShell，再运行本脚本。"
  exit 1
}

Write-Host "Git executable: $gitPath"
& $gitPath --version
if ($LASTEXITCODE -ne 0) {
  Write-Error "Git 可执行文件存在，但 git --version 执行失败。"
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "PATH lookup:"
where.exe git

if ($ConfigureGit) {
  & $gitPath config --global core.longpaths true
  if ($LASTEXITCODE -ne 0) { throw "设置 core.longpaths 失败。" }
  Write-Host "已启用 Git 长路径支持（core.longpaths=true）。"
}

Write-Host ""
Write-Host "Git 环境检查通过。"
