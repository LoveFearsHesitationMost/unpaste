"use client"

import { Icon } from "@iconify/react"
import {
  CheckIcon,
  CodeIcon,
  CopyIcon,
  TextAlignLeftIcon
} from "@phosphor-icons/react"
import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { FILENAME_ICON_MAP } from "~/lib/language"
import type { ComponentProps, HTMLAttributes, ReactNode } from "react"
import { createContext, Fragment, useContext, useState } from "react"

/**
 * 取自 kibo-ui 的 code-block（https://www.kibo-ui.com/components/code-block），
 * 按本站需要做了四处裁剪：
 *   1. 高亮在 Worker 侧完成（Shiki + JS 正则引擎，见 app/lib/highlight.server.ts），
 *      因此删掉了原组件里浏览器端的高亮逻辑；
 *   2. 文件数据直接携带渲染好的 HTML；
 *   3. 图标改用 Iconify（品牌图标）+ Phosphor（通用回退），见
 *      app/lib/language.ts 的 FILENAME_ICON_MAP；
 *   4. 受控状态自己用 useState 维护（原组件依赖 @radix-ui/react-use-controllable-state），
 *      复制按钮的多态交给 Button 自身的 render 属性，不再 cloneElement。
 */

/** 文件标签图标的统一尺寸，品牌图标与 Phosphor 回退保持一致。 */
const filenameIconClassName = "h-4 w-4 shrink-0"

const lineNumberClassNames = cn(
  "[&_code]:[counter-reset:line]",
  "[&_code]:[counter-increment:line_0]",
  "[&_.line]:before:content-[counter(line)]",
  "[&_.line]:before:inline-block",
  "[&_.line]:before:[counter-increment:line]",
  "[&_.line]:before:w-4",
  "[&_.line]:before:mr-4",
  "[&_.line]:before:text-[13px]",
  "[&_.line]:before:text-right",
  "[&_.line]:before:text-muted-foreground/50",
  "[&_.line]:before:font-mono",
  "[&_.line]:before:select-none"
)

const darkModeClassNames = cn(
  "dark:[&_.shiki]:!text-[var(--shiki-dark)]",
  "dark:[&_.shiki]:![font-style:var(--shiki-dark-font-style)]",
  "dark:[&_.shiki]:![font-weight:var(--shiki-dark-font-weight)]",
  "dark:[&_.shiki]:![text-decoration:var(--shiki-dark-text-decoration)]",
  "dark:[&_.shiki_span]:!text-[var(--shiki-dark)]",
  "dark:[&_.shiki_span]:![font-style:var(--shiki-dark-font-style)]",
  "dark:[&_.shiki_span]:![font-weight:var(--shiki-dark-font-weight)]",
  "dark:[&_.shiki_span]:![text-decoration:var(--shiki-dark-text-decoration)]"
)

const lineHighlightClassNames = cn(
  "[&_.line.highlighted]:bg-blue-50",
  "[&_.line.highlighted]:after:bg-blue-500",
  "[&_.line.highlighted]:after:absolute",
  "[&_.line.highlighted]:after:left-0",
  "[&_.line.highlighted]:after:top-0",
  "[&_.line.highlighted]:after:bottom-0",
  "[&_.line.highlighted]:after:w-0.5",
  "dark:[&_.line.highlighted]:!bg-blue-500/10"
)

const lineDiffClassNames = cn(
  "[&_.line.diff]:after:absolute",
  "[&_.line.diff]:after:left-0",
  "[&_.line.diff]:after:top-0",
  "[&_.line.diff]:after:bottom-0",
  "[&_.line.diff]:after:w-0.5",
  "[&_.line.diff.add]:bg-emerald-50",
  "[&_.line.diff.add]:after:bg-emerald-500",
  "[&_.line.diff.remove]:bg-rose-50",
  "[&_.line.diff.remove]:after:bg-rose-500",
  "dark:[&_.line.diff.add]:!bg-emerald-500/10",
  "dark:[&_.line.diff.remove]:!bg-rose-500/10"
)

const lineFocusedClassNames = cn(
  "[&_code:has(.focused)_.line]:blur-[2px]",
  "[&_code:has(.focused)_.line.focused]:blur-none"
)

const wordHighlightClassNames = cn(
  "[&_.highlighted-word]:bg-blue-50",
  "dark:[&_.highlighted-word]:!bg-blue-500/10"
)

const codeBlockClassName = cn(
  "mt-0 bg-background text-sm",
  "[&_pre]:py-4",
  "[&_.shiki]:!bg-transparent",
  "[&_code]:grid",
  "[&_code]:overflow-x-auto",
  "[&_code]:pb-3",
  "[&_code]:-mb-3.5",
  "[&_code]:bg-transparent",
  "[&_.line]:px-4",
  "[&_.line]:w-full",
  "[&_.line]:relative"
)

export type CodeBlockData = {
  language: string
  filename: string
  /** 原始代码，用于复制。 */
  code: string
  /** Shiki 在服务端渲染好的高亮 HTML。 */
  html: string
}

type CodeBlockContextType = {
  value: string | undefined
  onValueChange: ((value: string) => void) | undefined
  data: CodeBlockData[]
}

const CodeBlockContext = createContext<CodeBlockContextType>({
  value: undefined,
  onValueChange: undefined,
  data: []
})

export type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  data: CodeBlockData[]
}

export const CodeBlock = ({
  value: controlledValue,
  onValueChange: controlledOnValueChange,
  defaultValue,
  className,
  data,
  ...props
}: CodeBlockProps) => {
  // 受控/非受控二选一：传了 value 就完全听调用方的，否则自己存一份。
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? "")
  const value = controlledValue ?? uncontrolledValue

  const onValueChange = (nextValue: string) => {
    if (controlledValue === undefined) setUncontrolledValue(nextValue)
    controlledOnValueChange?.(nextValue)
  }

  return (
    <CodeBlockContext.Provider value={{ value, onValueChange, data }}>
      <div
        className={cn("size-full overflow-hidden rounded-md border", className)}
        {...props}
      />
    </CodeBlockContext.Provider>
  )
}

export type CodeBlockHeaderProps = HTMLAttributes<HTMLDivElement>

export const CodeBlockHeader = ({
  className,
  ...props
}: CodeBlockHeaderProps) => (
  <div
    className={cn(
      "flex flex-row items-center gap-1 border-b bg-secondary p-1",
      className
    )}
    {...props}
  />
)

export type CodeBlockFilesProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: (item: CodeBlockData) => ReactNode
}

export const CodeBlockFiles = ({
  className,
  children,
  ...props
}: CodeBlockFilesProps) => {
  const { data } = useContext(CodeBlockContext)

  return (
    <div
      className={cn("flex grow flex-row items-center gap-2", className)}
      {...props}
    >
      {data.map((item) => (
        <Fragment key={item.filename}>{children(item)}</Fragment>
      ))}
    </div>
  )
}

export type CodeBlockFilenameProps = HTMLAttributes<HTMLDivElement> & {
  /** Iconify 图标名，例如 `simple-icons:php`；省略时按 detectLanguage 自动推断。 */
  icon?: string
  value?: string
}

export const CodeBlockFilename = ({
  className,
  icon,
  value,
  children,
  ...props
}: CodeBlockFilenameProps) => {
  const { value: activeValue } = useContext(CodeBlockContext)

  if (value !== activeValue) {
    return null
  }

  const filename = children as string
  // 解析顺序：.txt → 文件名模式 → Phosphor 通用图标。
  const isPlainText = filename.trim().toLowerCase().endsWith(".txt")
  const filenameIcon = isPlainText
    ? undefined
    : Object.entries(FILENAME_ICON_MAP).find(([pattern]) => {
        const regex = new RegExp(
          `^${pattern.replace(/\\/g, "\\\\").replace(/\./g, "\\.").replace(/\*/g, ".*")}$`
        )
        return regex.test(filename)
      })?.[1]
  const iconName = icon ?? filenameIcon

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 text-muted-foreground text-xs",
        className
      )}
      {...props}
    >
      {iconName ? (
        <Icon className={filenameIconClassName} icon={iconName} />
      ) : isPlainText ? (
        <TextAlignLeftIcon className={filenameIconClassName} />
      ) : (
        <CodeIcon className={filenameIconClassName} />
      )}
      <span className="flex-1 truncate">{children}</span>
    </div>
  )
}

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  onCopy?: () => void
  onError?: (error: Error) => void
  timeout?: number
}

// 需要换成非 button 元素时，把元素交给 Button 自己的 render 属性
// （<CodeBlockCopyButton render={<a href="…" />} />），不再用 asChild + cloneElement。
export const CodeBlockCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: CodeBlockCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false)
  const { data, value } = useContext(CodeBlockContext)
  const code = data.find((item) => item.filename === value)?.code

  const copyToClipboard = () => {
    if (
      typeof window === "undefined" ||
      !navigator.clipboard.writeText ||
      !code
    ) {
      return
    }

    navigator.clipboard.writeText(code).then(() => {
      setIsCopied(true)
      onCopy?.()

      setTimeout(() => setIsCopied(false), timeout)
    }, onError)
  }

  const Icon = isCopied ? CheckIcon : CopyIcon

  return (
    <Button
      aria-label={isCopied ? "已复制" : "复制代码"}
      className={cn("shrink-0", className)}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <Icon className="text-muted-foreground" size={14} />}
    </Button>
  )
}

export type CodeBlockBodyProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: (item: CodeBlockData) => ReactNode
}

export const CodeBlockBody = ({ children, ...props }: CodeBlockBodyProps) => {
  const { data } = useContext(CodeBlockContext)

  return (
    <div {...props}>
      {data.map((item) => (
        <Fragment key={item.filename}>{children(item)}</Fragment>
      ))}
    </div>
  )
}

export type CodeBlockItemProps = HTMLAttributes<HTMLDivElement> & {
  value: string
  lineNumbers?: boolean
}

export const CodeBlockItem = ({
  children,
  lineNumbers = true,
  className,
  value,
  ...props
}: CodeBlockItemProps) => {
  const { value: activeValue } = useContext(CodeBlockContext)

  if (value !== activeValue) {
    return null
  }

  return (
    <div
      className={cn(
        codeBlockClassName,
        lineHighlightClassNames,
        lineDiffClassNames,
        lineFocusedClassNames,
        wordHighlightClassNames,
        darkModeClassNames,
        lineNumbers && lineNumberClassNames,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
