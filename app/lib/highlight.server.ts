import {
  transformerNotationDiff,
  transformerNotationErrorLevel,
  transformerNotationFocus,
  transformerNotationHighlight,
  transformerNotationWordHighlight
} from "@shikijs/transformers"
import {
  createHighlighterCore,
  type DynamicImportLanguageRegistration,
  type HighlighterCore
} from "shiki/core"
import { createJavaScriptRegexEngine } from "shiki/engine/javascript"

/**
 * 服务端代码高亮。
 *
 * 两个关键选择：
 * 1. 用 JavaScript 正则引擎而不是默认的 Oniguruma WASM——Workers 无法从
 *    二进制数据初始化 WASM，JS 引擎不需要任何 wasm 资源；
 * 2. 语法与主题按需加载（fine-grained bundle），只把真正用到的语言打进
 *    Worker 包，冷启动时也不必解析几十份语法。
 */
const LANGUAGE_LOADERS: Record<
  string,
  DynamicImportLanguageRegistration | undefined
> = {
  astro: () => import("@shikijs/langs/astro"),
  bat: () => import("@shikijs/langs/bat"),
  c: () => import("@shikijs/langs/c"),
  cmake: () => import("@shikijs/langs/cmake"),
  cpp: () => import("@shikijs/langs/cpp"),
  csharp: () => import("@shikijs/langs/csharp"),
  css: () => import("@shikijs/langs/css"),
  dart: () => import("@shikijs/langs/dart"),
  diff: () => import("@shikijs/langs/diff"),
  dockerfile: () => import("@shikijs/langs/dockerfile"),
  go: () => import("@shikijs/langs/go"),
  graphql: () => import("@shikijs/langs/graphql"),
  hcl: () => import("@shikijs/langs/hcl"),
  html: () => import("@shikijs/langs/html"),
  ini: () => import("@shikijs/langs/ini"),
  java: () => import("@shikijs/langs/java"),
  javascript: () => import("@shikijs/langs/javascript"),
  json: () => import("@shikijs/langs/json"),
  jsonc: () => import("@shikijs/langs/jsonc"),
  jsx: () => import("@shikijs/langs/jsx"),
  kotlin: () => import("@shikijs/langs/kotlin"),
  less: () => import("@shikijs/langs/less"),
  lua: () => import("@shikijs/langs/lua"),
  makefile: () => import("@shikijs/langs/makefile"),
  matlab: () => import("@shikijs/langs/matlab"),
  markdown: () => import("@shikijs/langs/markdown"),
  mdx: () => import("@shikijs/langs/mdx"),
  nginx: () => import("@shikijs/langs/nginx"),
  pascal: () => import("@shikijs/langs/pascal"),
  perl: () => import("@shikijs/langs/perl"),
  php: () => import("@shikijs/langs/php"),
  powershell: () => import("@shikijs/langs/powershell"),
  python: () => import("@shikijs/langs/python"),
  r: () => import("@shikijs/langs/r"),
  ruby: () => import("@shikijs/langs/ruby"),
  rust: () => import("@shikijs/langs/rust"),
  sass: () => import("@shikijs/langs/sass"),
  scss: () => import("@shikijs/langs/scss"),
  shellscript: () => import("@shikijs/langs/shellscript"),
  sql: () => import("@shikijs/langs/sql"),
  svelte: () => import("@shikijs/langs/svelte"),
  swift: () => import("@shikijs/langs/swift"),
  toml: () => import("@shikijs/langs/toml"),
  tsx: () => import("@shikijs/langs/tsx"),
  typescript: () => import("@shikijs/langs/typescript"),
  vb: () => import("@shikijs/langs/vb"),
  vue: () => import("@shikijs/langs/vue"),
  xml: () => import("@shikijs/langs/xml"),
  yaml: () => import("@shikijs/langs/yaml"),
  zig: () => import("@shikijs/langs/zig")
}

/** 浅色 / 深色双主题，样式变量由 kibo 的 CodeBlock 消费。 */
export const CODE_THEMES = {
  light: "catppuccin-latte",
  dark: "vitesse-dark"
} as const

/**
 * 超过这个长度的文件放弃语法高亮，退化成纯文本。
 * Shiki 的 JS 正则引擎在高亮超大文件时会吃掉大量 CPU，而 Worker 有 CPU 时间上限。
 */
export const MAX_HIGHLIGHT_LENGTH = 100_000

let highlighterPromise: Promise<HighlighterCore> | undefined

/** 每种语言只加载一次：缓存 loadLanguage 的 promise，避免并发重复注册。 */
const languageLoads = new Map<string, Promise<void>>()

function getHighlighter(): Promise<HighlighterCore> {
  return (highlighterPromise ??= createHighlighterCore({
    themes: [
      import("@shikijs/themes/catppuccin-latte"),
      import("@shikijs/themes/vitesse-dark")
    ],
    langs: [],
    engine: createJavaScriptRegexEngine()
  }))
}

/** 把代码渲染成 Shiki 的 HTML（含 span.line，供前端做行号与高亮）。 */
export async function highlightToHtml(
  code: string,
  language: string
): Promise<string> {
  const highlighter = await getHighlighter()
  const loader = LANGUAGE_LOADERS[language]

  if (loader && !highlighter.getLoadedLanguages().includes(language)) {
    let load = languageLoads.get(language)
    if (!load) {
      load = highlighter.loadLanguage(loader()).then(() => undefined)
      languageLoads.set(language, load)
    }
    await load
  }

  return highlighter.codeToHtml(code, {
    lang: loader ? language : "plaintext",
    themes: CODE_THEMES,
    transformers: [
      transformerNotationDiff({ matchAlgorithm: "v3" }),
      transformerNotationHighlight({ matchAlgorithm: "v3" }),
      transformerNotationWordHighlight({ matchAlgorithm: "v3" }),
      transformerNotationFocus({ matchAlgorithm: "v3" }),
      transformerNotationErrorLevel({ matchAlgorithm: "v3" })
    ]
  })
}
