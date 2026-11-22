# ModSearch 二次开发版：构建与引擎配置

## 1. 构建

要求 Node.js >= 22.13。项目使用 pnpm：

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

构建成功后，CLI 入口为 `dist/main.js`。本次源码包未包含预编译 `dist/`，需要在目标机器执行 `pnpm build`。

## 2. Google Custom Search

本项目的 `google` 引擎使用 Google Custom Search JSON API。需要两项配置：

- API Key：`GOOGLE_CSE_API_KEY`
- Programmable Search Engine ID（cx）：`GOOGLE_CSE_CX`

也可以在 ModSearch 配置文件中设置：

```bash
modsearch config set google.apiKey YOUR_GOOGLE_API_KEY
modsearch config set google.model YOUR_SEARCH_ENGINE_ID_CX
```

没有这两项配置时，Google 引擎保持未就绪，不会被自动路由选中。Google 是否允许新账号申请该 API，以 Google 当前政策和账号资格为准。

## 3. Microsoft Azure Foundry Web Search

本项目的 `azure` 引擎连接的是 **Azure Foundry Web Search toolbox 的 MCP HTTP endpoint**，不是已经退役的旧版 Bing Search API。

先在 Microsoft Foundry 项目中创建 Web Search toolbox，并取得 MCP URL。官方文档中的 URL 结构为：

```text
https://<resource>.services.ai.azure.com/api/projects/<project>/toolboxes/<toolbox-name>/versions/<version>/mcp?api-version=v1
```

然后使用 Microsoft Entra 身份验证取得当前访问令牌。此令牌需要具有访问 Foundry 项目的权限；令牌会过期，需要定期刷新。配置：

```bash
modsearch config set azure.baseURL "https://<resource>.services.ai.azure.com/api/projects/<project>/toolboxes/<name>/versions/<version>/mcp?api-version=v1"
modsearch config set azure.apiKey YOUR_CURRENT_ENTRA_ACCESS_TOKEN
```

也可使用环境变量：

```text
AZURE_FOUNDRY_MCP_URL
AZURE_FOUNDRY_TOKEN
```

Azure Web Search / Bing grounding 可能产生费用，具体以 Azure 订阅和区域价格为准。MCP 工具的输入字段会从 toolbox 的 `tools/list` schema 中探测；如果 toolbox 暴露的工具没有可识别的搜索工具或查询字段，会返回明确错误，而不是静默伪造结果。

官方说明：https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/web-search

## 4. 实时网络监控

在 dsh 的 ModSearch 插件配置卡片中打开页面后，监控区每 2 秒刷新一次：

- API 请求次数
- 上传请求正文大小
- 下载响应正文大小
- 最近请求对应的引擎、HTTP 状态码和字节数

记录文件：`~/.modsearch/network-usage.jsonl`。只记录引擎名、时间、状态码、耗时和正文大小；不记录 URL、搜索词、请求/响应正文、请求头或 API 密钥。

**统计口径：**这是 ModSearch `requestText` 网络请求的 HTTP 正文流量，不是操作系统网卡层的总流量；不包含 TLS 开销、HTTP headers，也不覆盖 Antigravity/Grok 等外部 CLI 进程自行产生的网络流量。
