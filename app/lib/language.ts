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
  conf: "ini",
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
  lua: "lua",
  pl: "perl",
  pm: "perl",
  r: "r",
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
