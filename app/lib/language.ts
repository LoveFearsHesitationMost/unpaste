/**
 * 文件类型识别：扩展名 / 特殊文件名 → Shiki 语言 id。
 *
 * 这里只做映射，不引入 shiki，因此浏览器端（编辑器、文件标签）也可以安全
 * 导入。真正参与高亮的语言集合见 highlight.server.ts。
 */

/** 无法识别时使用的语言（Shiki 的 plaintext）。 */
export const FALLBACK_LANGUAGE = "plaintext"

const EXTENSION_LANGUAGE: Record<string, string> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "tsx",
  json: "json",
  jsonc: "jsonc",
  html: "html",
  htm: "html",
  vue: "vue",
  svelte: "svelte",
  astro: "astro",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  md: "markdown",
  markdown: "markdown",
  mdx: "mdx",
  mdc: "markdown",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  ini: "ini",
  conf: "toml",
  env: "ini",
  properties: "ini",
  xml: "xml",
  svg: "xml",
  sql: "sql",
  py: "python",
  rb: "ruby",
  rs: "rust",
  go: "go",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  swift: "swift",
  dart: "dart",
  php: "php",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  hh: "cpp",
  cs: "csharp",
  pas: "pascal",
  pp: "pascal",
  lpr: "pascal",
  dpr: "pascal",
  vb: "vb",
  vbs: "vb",
  lua: "lua",
  pl: "perl",
  pm: "perl",
  r: "r",
  m: "matlab",
  zig: "zig",
  sh: "shellscript",
  bash: "shellscript",
  zsh: "shellscript",
  fish: "shellscript",
  ps1: "powershell",
  psm1: "powershell",
  bat: "bat",
  cmd: "bat",
  diff: "diff",
  patch: "diff",
  graphql: "graphql",
  gql: "graphql",
  tf: "hcl",
  tfvars: "hcl",
  hcl: "hcl",
  nginx: "nginx",
  txt: "plaintext",
  text: "plaintext",
  log: "plaintext",
  csv: "plaintext"
}

const FILENAME_LANGUAGE: Record<string, string> = {
  dockerfile: "dockerfile",
  "docker-compose.yml": "yaml",
  "docker-compose.yaml": "yaml",
  makefile: "makefile",
  "cmakelists.txt": "cmake",
  ".gitignore": "plaintext",
  ".env": "ini",
  ".editorconfig": "ini",
  ".npmrc": "ini",
  "nginx.conf": "nginx",
  caddyfile: "plaintext"
}

/**
 * 文件名模式 → Iconify 图标名，供 CodeBlock 的文件标签使用。
 *
 * 键是 glob 风格的文件名模式，值是 Iconify 的“集合:名称”字符串
 * （simple-icons 的既有图标即 `simple-icons:<名称>`），由 @iconify/react 在
 * 客户端按需拉取，打包产物里不含任何图标数据。
 *
 * 与上面的 EXTENSION_LANGUAGE 尽量保持一致：这里新增语言的扩展名
 * （java / cs / ps1 / psm1 / vb / vbs / m / pas / pp / lpr / dpr / sql）
 * 在 EXTENSION_LANGUAGE 里都能推断出对应语言。
 */
export const FILENAME_ICON_MAP: Record<string, string> = {
  ".env": "simple-icons:dotenv",
  "*.astro": "simple-icons:astro",
  "biome.json": "simple-icons:biome",
  ".bowerrc": "simple-icons:bower",
  "bun.lockb": "simple-icons:bun",
  "*.c": "simple-icons:c",
  "*.cpp": "simple-icons:cplusplus",
  ".circleci/config.yml": "simple-icons:circleci",
  "*.coffee": "simple-icons:coffeescript",
  "*.module.css": "simple-icons:cssmodules",
  "*.css": "simple-icons:css",
  "*.dart": "simple-icons:dart",
  Dockerfile: "simple-icons:docker",
  "docusaurus.config.js": "simple-icons:docusaurus",
  ".editorconfig": "simple-icons:editorconfig",
  ".eslintrc": "simple-icons:eslint",
  "eslint.config.*": "simple-icons:eslint",
  "gatsby-config.*": "simple-icons:gatsby",
  ".gitignore": "simple-icons:gitignoredotio",
  "*.go": "simple-icons:go",
  "*.graphql": "simple-icons:graphql",
  "*.sh": "simple-icons:gnubash",
  "Gruntfile.*": "simple-icons:grunt",
  "gulpfile.*": "simple-icons:gulp",
  "*.hbs": "simple-icons:handlebarsdotjs",
  "*.html": "simple-icons:html5",
  "*.js": "simple-icons:javascript",
  "*.json": "simple-icons:json",
  "*.test.js": "simple-icons:jest",
  "*.less": "simple-icons:less",
  "*.md": "simple-icons:markdown",
  "*.mdx": "simple-icons:mdx",
  "mintlify.json": "simple-icons:mintlify",
  "mocha.opts": "simple-icons:mocha",
  "*.mustache": "simple-icons:handlebarsdotjs",
  "*.sql": "carbon:sql",
  "next.config.*": "simple-icons:nextdotjs",
  "*.pl": "simple-icons:perl",
  "*.php": "simple-icons:php",
  "postcss.config.*": "simple-icons:postcss",
  "prettier.config.*": "simple-icons:prettier",
  "*.prisma": "simple-icons:prisma",
  "*.pug": "simple-icons:pug",
  "*.py": "simple-icons:python",
  "*.r": "simple-icons:r",
  "*.rb": "simple-icons:ruby",
  "*.jsx": "simple-icons:react",
  "*.tsx": "simple-icons:react",
  "readme.md": "simple-icons:readme",
  "*.rdb": "simple-icons:redis",
  "remix.config.*": "simple-icons:remix",
  "*.riv": "simple-icons:rive",
  "rollup.config.*": "simple-icons:rollupdotjs",
  "sanity.config.*": "simple-icons:sanity",
  "*.sass": "simple-icons:sass",
  "*.scss": "simple-icons:sass",
  "*.sc": "simple-icons:scala",
  "*.scala": "simple-icons:scala",
  "sentry.client.config.*": "simple-icons:sentry",
  "components.json": "simple-icons:shadcnui",
  "storybook.config.*": "simple-icons:storybook",
  "stylelint.config.*": "simple-icons:stylelint",
  ".sublime-settings": "simple-icons:sublimetext",
  "*.svelte": "simple-icons:svelte",
  "*.svg": "simple-icons:svg",
  "*.swift": "simple-icons:swift",
  "tailwind.config.*": "simple-icons:tailwindcss",
  "*.toml": "simple-icons:toml",
  "*.ts": "simple-icons:typescript",
  "vercel.json": "simple-icons:vercel",
  "vite.config.*": "simple-icons:vite",
  "*.vue": "simple-icons:vuedotjs",
  "*.wasm": "simple-icons:webassembly",
  // 追加：原先未收录语言的文件名模式，与 EXTENSION_LANGUAGE 对齐。
  "*.java": "ant-design:java-outlined",
  "*.cs": "nonicons:c-sharp-16",
  "*.ps1": "cib:powershell",
  "*.psm1": "cib:powershell",
  "*.vb": "clarity:blocks-group-solid",
  "*.vbs": "clarity:blocks-group-solid",
  "*.m": "devicon-plain:matlab",
  "*.pas": "devicon-plain:delphi",
  "*.pp": "devicon-plain:delphi",
  "*.lpr": "devicon-plain:delphi",
  "*.dpr": "devicon-plain:delphi"
}

/** 依据文件名推断 Shiki 语言 id。 */
export function detectLanguage(filename: string): string {
  const name = filename.trim().toLowerCase()
  const byName = FILENAME_LANGUAGE[name]
  if (byName) return byName

  const dot = name.lastIndexOf(".")
  if (dot <= 0 || dot === name.length - 1) return FALLBACK_LANGUAGE
  return EXTENSION_LANGUAGE[name.slice(dot + 1)] ?? FALLBACK_LANGUAGE
}

/** 是否为 Markdown 家族文件（需要富文本预览）。 */
export function isMarkdownFile(filename: string): boolean {
  return /\.(md|markdown|mdx|mdc)$/i.test(filename.trim())
}
