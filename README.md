# unpaste

部署在 **Cloudflare Workers** 上的极简 pastebin / gist：把代码或文本粘成一条带随机 slug 的链接。
全栈只用一套运行时与一个数据库——Workers + D1，没有 Redis、没有外部搜索服务、没有容器。

## 特性

- **React Router v8（framework mode, SSR）+ Cloudflare Vite 插件**：开发时跑在 workerd 里，与线上环境一致。
- **D1 + Drizzle ORM**：唯一持久化设施；会话、snippet、OAuth 临时状态全部落在 D1。
- **GitHub OAuth 登录**：不维护自有账号体系，users 表主键就是 GitHub 数字 ID。
  OAuth 全流程交给 **openid-client**（授权地址拼装、PKCE、state 校验、token 交换、带 Bearer 的资源请求），
  本站只负责把 state + code_verifier 存进 D1、并用 cookie 把回调绑定到发起授权的浏览器，state 一次性消费。
- **权限模型**：公开 snippet 任何人可见；私密 snippet 仅作者本人与全局管理员可见。
  所有无权访问的情形——包括「slug 不存在」——一律返回**同一个 404**，无法用于枚举爆破。
- **服务端 Shiki 高亮**：用 JavaScript 正则引擎（无需 WASM），语法与主题按需加载；
  浅色/深色双主题，兼容 kibo-ui 的 CodeBlock 行号与复制按钮。
- **Markdown 富文本预览**：`.md/.markdown/.mdx/.mdc` 文件可切换「预览 / 源码」，
  使用 react-markdown + remark-gfm（不渲染原始 HTML，天然免疫粘贴内容里的 XSS）。
- **shadcn/ui + kibo-ui + Phosphor 图标**：Tailwind v4 语义色 + 深浅色主题。
- ESLint 9 扁平配置（TS + React + Hooks + JSX 规则）与 Prettier 统一代码风格。

## 技术栈

| 层           | 选型                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------- |
| 运行时       | Cloudflare Workers（`workers/app.ts` 为入口，`observability` 已开启）                                         |
| 框架         | React Router v8 framework mode（`ssr: true`），Vite 8 + `@cloudflare/vite-plugin`                             |
| 数据库 / ORM | Cloudflare D1 + Drizzle ORM（`drizzle-kit` 生成迁移，`wrangler` 执行）                                        |
| 鉴权         | GitHub OAuth（openid-client 6；GitHub 不是 OIDC Provider，故手工提供端点元数据）+ D1 会话表 + HttpOnly cookie |
| 时间处理     | date-fns 4 + `@date-fns/utc`（中文 locale；服务端计算并格式化，杜绝 hydration 漂移）                          |
| UI           | Tailwind CSS v4、shadcn/ui（`radix-lyra` 预设 + Phosphor 图标）、kibo-ui（code-block）                        |
| 背景动效     | React Bits PixelBlast（`three` + `postprocessing`，仅登录页，`.client` 模块懒加载）                           |
| 高亮 / 渲染  | Shiki（JS engine）、react-markdown + remark-gfm                                                               |

## 目录结构

```
app/
  config.ts                 全局配置：ADMIN_GITHUB_ID、会话参数、GitHub 端点
  root.tsx                  文档骨架 + 顶部导航 + authMiddleware
  routes.ts                 路由表
  context.ts                SessionUser 类型与路由 context
  routes/
    home.tsx                首页：公开 snippet 列表（分页）
    login.tsx               登录引导页
    auth-github.tsx         OAuth 起点（生成 state/PKCE，302 到 GitHub）
    auth-callback.tsx       OAuth 回调（换 token、拉资料、建会话）
    auth-logout.tsx         退出登录（销毁 D1 中的会话）
    snippet-new.tsx         新建
    snippet.tsx             详情：高亮 + Markdown 预览 + 管理入口
    snippet-edit.tsx        编辑
    snippet-delete.tsx      删除（仅 action）
    snippet-raw.tsx         纯文本原文
    my.tsx                  我的 snippet
    admin.tsx               全局管理（仅管理员）
  components/
    reactbits/
      pixel-blast.client.tsx  登录页 WebGL 像素背景（取自 React Bits，仅客户端打包）
  lib/
    schema.server.ts        Drizzle 表定义
    db.server.ts            Drizzle + D1 客户端
    session.server.ts       基于 D1 的 React Router 会话存储
    auth.server.ts          authMiddleware、requireLogin / requireUserOrNotFound / requireAdmin
    snippets.server.ts      snippet 数据访问与可见性判定
    highlight.server.ts     Shiki 服务端高亮
    github.server.ts        基于 openid-client 的 GitHub OAuth（授权请求、state 校验、token、取资料）
    users.server.ts         用户同步与查询
    validation.ts           表单校验（前后端共用）
    language.ts             扩展名 → 语言映射
    format.ts               date-fns 时间格式化/本地化/计算 + 体积格式化
  components/               site-header、snippet-card、snippet-viewer、snippet-editor…
  components/ui/            shadcn/ui 组件
  components/kibo-ui/       kibo-ui code-block（裁剪掉浏览器端高亮，改为消费服务端 HTML）
drizzle/                    drizzle-kit 生成的 SQL 迁移
workers/
  app.ts                    Worker 入口
  env.d.ts                  手写环境变量声明（Secrets）
```

## 本地开发

```bash
npm install
npm run db:migrate:local     # 建表（本地 .wrangler/state 中的 D1）
npm run dev                  # http://localhost:5173
```

### 配置 GitHub OAuth

1. 打开 GitHub → Settings → Developer settings → **OAuth Apps** → New OAuth App。
   - Homepage URL：`http://localhost:5173`（线上改成真实站点）
   - Authorization callback URL：`http://localhost:5173/auth/github/callback`
     （线上是 `https://<你的域名>/auth/github/callback`）
2. 把 Client ID / Secret 写进本地 `.dev.vars`（可以从 `.dev.vars.example` 复制，该文件已被 `.gitignore` 忽略）：

   ```
   GITHUB_CLIENT_ID=你的 Client ID
   GITHUB_CLIENT_SECRET=你的 Client Secret
   ```

   线上用密钥存储：

   ```bash
   wrangler secret put GITHUB_CLIENT_SECRET
   # GITHUB_CLIENT_ID 不是机密，填在 wrangler.jsonc 的 vars.GITHUB_CLIENT_ID
   ```

3. 需要自建 GitHub Enterprise 或做本地联调时，可用
   `GITHUB_BASE_URL` / `GITHUB_API_BASE_URL` 覆盖 OAuth 与 API 端点。

#### 回调失败排查（两个坑，都踩过）

**① GitHub 的 RFC 9207 `iss` 参数（2026-04 起，最容易中招）**

GitHub 现在会在回调 URL 上附加 `iss=https://github.com/login/oauth`，而
openid-client 会**无条件**拿它与元数据里的 `issuer` 比对，不一致就抛
`ClientError: invalid response encountered` —— 这个错误发生在**任何 token 请求之前**，
所以 GitHub 面板上 Client secret 会一直显示 "never used"，很容易被误判成密钥错。
因此 `app/config.ts` 里 issuer 默认按 base URL 推导为 `<base>/login/oauth`
（github.com 即 `https://github.com/login/oauth`）。自建 GHE 若 `iss` 不同，
用 `GITHUB_ISSUER` 覆盖。没有 `iss` 的回调（旧版 GHE / mock）不受影响。

**② token 端点出错也返回 200**

GitHub 的 token 端点在**出错时也返回 HTTP 200**，错误写在 JSON body 的
`error` 字段里；而 oauth4webapi 只在状态码非 200 时才解析错误体，于是会把
`{"error":"incorrect_client_credentials",…}` 判成「响应里没有 access_token」，
同样报 `invalid response encountered`。`app/lib/github.server.ts` 的
`normalizeGithubTokenFailure` 把这类响应改写成 400，于是 GitHub 的原文会正常抛出，
并随 `/login?error=oauth_failed&reason=<GitHub 的 error 代码>` 显示在登录页上；
若响应里既无 `error` 也无 `access_token`，原始报文会写进 Worker 日志便于排查。

常见 `reason` 与对策：

| reason                         | 含义                                           | 对策                                                                                                                                                                                  |
| ------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `incorrect_client_credentials` | `GITHUB_CLIENT_SECRET` 与 OAuth App 上的不一致 | 重新复制 Secret；注意**不要把引号或换行一起塞进去**（用 `echo` 管道喂给 `wrangler secret put` 时，引号会成为密钥的一部分），改完再执行一次 `wrangler secret put GITHUB_CLIENT_SECRET` |
| `redirect_uri_mismatch`        | 当前域名没登记                                 | 用哪个域名访问就要把该域名的 `/auth/github/callback` 填进 OAuth App                                                                                                                   |
| `bad_verification_code`        | 授权码过期/重复使用                            | 重新发起登录                                                                                                                                                                          |
| `unverified_user_email`        | GitHub 账号未验证主邮箱                        | 去 GitHub 验证邮箱                                                                                                                                                                    |

未配置 Client ID 时，登录页会直接给出上述配置提示，不会 500。

### 配置全局管理员

编辑 `app/config.ts`：

```ts
export const ADMIN_GITHUB_ID = "12345678" // GitHub 数字账号 ID，不是用户名
```

数字 ID 可以从 <https://api.github.com/users/你的用户名> 的 `id` 字段取得，
或者登录本站后在「我的」页面看到。留空字符串表示不设管理员。

## 部署

```bash
npm run db:create                 # wrangler d1 create unpaste-db，把输出的 database_id 填进 wrangler.jsonc
npm run db:migrate:remote         # 在线上 D1 执行迁移
wrangler secret put GITHUB_CLIENT_SECRET
npm run deploy                    # 构建并发布 Worker
```

部署后把 GitHub OAuth App 的 callback URL 改成线上地址即可。

### 两个部署坑（踩过）

1. **必须用 `npm run deploy`（即不带 `-c` 的 `wrangler deploy`）**。静态资源不在
   `wrangler.jsonc` 里，而是由 `@cloudflare/vite-plugin` 构建时写进
   `.wrangler/deploy/config.json` → `build/server/wrangler.json`（含
   `main: index.js` 与 `assets: ../client`）；`wrangler deploy` 会自动读取它。
   若显式传 `-c wrangler.jsonc`，会直接编译 `workers/app.ts` 并因无法解析
   `virtual:react-router/server-build` 而失败——退一万步就算成功，也没有
   `assets` 绑定，届时 `/assets/*.js` 全部落到 Worker 上并报
   `No route matches URL "/assets/..."`（页面白屏、但 HTML 却是好的）。
2. **不要在构建过程中部署**。SSR 出来的 HTML 与同一次构建产出的客户端资源名是
   一一对应的，若部署时 `build/` 正处于半新半旧状态，就会出现 HTML 引用
   `entry.client-XXXX.js` 而资源目录里没有该文件的 404 连发。发布前请确认
   `npm run build` 已完整结束。

**远端 D1 不做迁移就会 500**：`/` 首页执行 `select count(*) ... from snippets`
时报 `no such table: snippets`，Worker 返回 500——迁移是手动步骤，别忘了
`npm run db:migrate:remote`（`wrangler d1 migrations list DB --remote` 可查待应用项）。

## 数据模型

| 表              | 说明                                                                           |
| --------------- | ------------------------------------------------------------------------------ |
| `users`         | GitHub 账户，主键 `id` 即 GitHub 数字 ID（改名不影响身份）                     |
| `sessions`      | 会话：cookie 只存随机 ID，凭据在 D1；`expires_at` 过期即失效（登录时顺带清理） |
| `oauth_states`  | OAuth 的 state + PKCE `code_verifier`，10 分钟有效、消费一次即删               |
| `snippets`      | 元数据：`slug`（唯一随机 10 位）、标题、作者、`visibility`、时间               |
| `snippet_files` | 分文件内容：`filename`、`content`、`language`、`position`                      |

## 权限矩阵

| 角色       | 公开 snippet       | 自己创建的 snippet（公开/私密） | 他人的私密 snippet |
| ---------- | ------------------ | ------------------------------- | ------------------ |
| 未登录     | 查看               | —（未登录无从创建）             | 404                |
| 已登录用户 | 查看               | 查看 / 编辑 / 删除              | 404                |
| 管理员     | 查看 / 编辑 / 删除 | 查看 / 编辑 / 删除              | 查看 / 编辑 / 删除 |

- `/s/:slug`、`/s/:slug/edit`、`/s/:slug/delete`、`/s/:slug/raw`：无权访问时返回与
  「slug 不存在」**逐字节相同**的 404 页面（仅差异是 CSS 预载链接里的请求路径）。
- `/admin`：非管理员（含未登录）同样 404。
- `/new`、`/my`：不是资源页，未登录会引导到 `/login?redirectTo=…`。

## 开发脚本

| 命令                                             | 说明                                              |
| ------------------------------------------------ | ------------------------------------------------- |
| `npm run dev`                                    | 本地开发（workerd + 本地 D1）                     |
| `npm run build`                                  | 生产构建                                          |
| `npm run deploy`                                 | 构建并部署到 Workers                              |
| `npm run typecheck`                              | `wrangler types` + `react-router typegen` + `tsc` |
| `npm run lint` / `lint:fix`                      | ESLint（扁平配置，TS + React + Hooks + JSX）      |
| `npm run format`                                 | Prettier（双引号、无分号、80 列、无尾随逗号）     |
| `npm run db:generate`                            | 依据 schema 生成迁移 SQL                          |
| `npm run db:migrate:local` / `db:migrate:remote` | 应用迁移                                          |

## 设计取舍

- **OAuth 交给 openid-client，不自研**：GitHub 不是 OIDC Provider（没有 discovery 文档、不签发
  id_token、也没有 OIDC 语义的 userinfo），所以按 OAuth 2.0 的用法手工提供 Authorization Server
  元数据（`app/lib/github.server.ts`），授权地址拼装、PKCE challenge/verifier、回调 state 校验、
  token 交换、带 Bearer 的资源请求全部由库完成；本站只负责把 state + code_verifier 落进 D1、
  并用 cookie 做浏览器绑定。明文（http）端点会自动 `allowInsecureRequests`，供本地联调/自建实例使用。
- **时间统一在服务端用 date-fns 算**：一周内用 `formatDistanceStrict(..., { locale: zhCN })` 给
  相对时间（“3 分钟前”），更久用 `UTCDate` 强制按 UTC 给出固定格式；结果作为字符串进 loaderData，
  浏览器不会再算一遍，因此不会出现服务端/客户端不一致的 hydration 抖动。
  会话与 OAuth state 的有效期同样用 date-fns 计算（`addMilliseconds` / `addMinutes` / `isBefore`）。
- **只用 D1**：不引入 Redis/搜索服务；列表、计数、体积统计都用 SQL 子查询完成。
- **Shiki 用 JS 正则引擎**：Workers 无法从二进制初始化 WASM，JS 引擎不需要任何 wasm 资源；
  语法与主题按需 `import()`，只把真正用到的语言打进 Worker 包。
  超过 100 000 字符的文件退化为纯文本高亮，避免吃掉 Worker 的 CPU 预算。
- **会话 cookie 不签名**：cookie 里只有 32 字节随机 ID，仅作为 D1 主键的查找键，
  伪造不出有效值，因此不需要额外的签名密钥（React Router 会打印一次相关警告，可忽略）。
- **Markdown 不做 HTML 直通**：react-markdown 默认转义/丢弃原始 HTML，粘贴内容里的
  `<script>` 不会被渲染；`/raw` 也带 `X-Content-Type-Options: nosniff` 与 `text/plain`。
- **前端不做富交互高亮**：详情页的高亮 HTML 由 Worker 渲染，浏览器只负责切换文件与主题。

## 已知限制

- 无全文搜索、无评论/点赞、无过期时间与自定义 slug（随机 slug 是防枚举设计的一部分）。
- 全局管理员只有一个（`app/config.ts`），且只认 GitHub 数字 ID。
- 单文件上限 200 000 字符、单 snippet 上限 20 个文件，见 `app/lib/validation.ts`。
