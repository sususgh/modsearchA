# Windows Git 环境修复与检查

本指南用于确认 Windows 上的 Git for Windows 已正确安装，并且可以被 PowerShell、命令提示符及第三方程序（包括 DSH）通过 PATH 找到。

## 1. 安装 Git for Windows

官方安装页面：

- https://git-scm.com/install/windows

普通 Intel/AMD Windows 电脑下载 x64 安装程序；Windows on ARM 选择 ARM64。

也可以在 PowerShell 中使用 Windows Package Manager：

```powershell
winget install --id Git.Git -e --source winget
```

安装向导中，最重要的是 **Adjusting your PATH environment** 页面，请选择：

**Git from the command line and also from 3rd-party software**

其他选项通常保持默认即可。该 PATH 选项可让 PowerShell、CMD 和第三方软件找到 Git。

## 2. 使用仓库脚本检查 Git

在仓库根目录打开 PowerShell：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-git-windows.ps1
```

如果希望脚本在检测不到 Git 时尝试通过 winget 安装：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-git-windows.ps1 -InstallGit
```

如果还希望启用 Git 长路径支持：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-git-windows.ps1 -ConfigureGit
```

`-ConfigureGit` 会修改当前 Windows 用户的全局 Git 配置，将 `core.longpaths` 设置为 `true`。不需要长路径支持时，不必使用此参数。

## 3. 手动验证

安装后关闭所有旧的终端窗口，重新打开 PowerShell，执行：

```powershell
git --version
where.exe git
git config --show-origin --get core.longpaths
```

- `git --version` 应显示 Git 版本。
- `where.exe git` 应至少返回一个 git.exe 路径，通常位于 `C:\Program Files\Git\cmd\git.exe`。
- 如果 PowerShell 仍提示找不到 git，重新运行安装程序，并确认 PATH 选项正确；也可以检查系统 PATH 是否包含 `C:\Program Files\Git\cmd`。

## 4. DSH / Git 安装排查

Git 环境检查通过，只能证明 Windows 能找到 Git，**不能单独证明 DSH 插件安装已经成功**。如果 DSH 仍返回退出码 1，请保留完整安装日志，重点检查：

1. DSH 运行进程是否能访问 Git（桌面程序在安装 Git 后需要完全退出并重新启动）。
2. GitHub HTTPS 地址是否可访问，以及代理/证书是否正常。
3. Node.js 版本是否满足项目要求（本项目要求 Node.js >= 22.13）。
4. pnpm 是否阻止 Git 依赖的 `prepare` 构建脚本；若日志提示构建脚本被忽略，应仅对确认可信的依赖按 pnpm 提示授权。
5. 构建或安装日志中的第一个真实错误，而不是只看最后的退出码。

不要把 GitHub 账号密码写进仓库、脚本或 URL。
