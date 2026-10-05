import {
  CircleNotchIcon,
  PlusIcon,
  TrashIcon,
  WarningCircleIcon
} from "@phosphor-icons/react"
import { useState } from "react"
import { Form, useNavigation } from "react-router"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle
} from "~/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { Switch } from "~/components/ui/switch"
import { Textarea } from "~/components/ui/textarea"
import {
  MAX_FILENAME_LENGTH,
  MAX_FILES_PER_SNIPPET,
  MAX_FILE_LENGTH,
  MAX_TITLE_LENGTH
} from "~/lib/validation"

export type SnippetEditorFile = { filename: string; content: string }

export type SnippetEditorProps = {
  /** 编辑已有 snippet 时传入初始值；新建时省略。 */
  initial?: {
    title: string
    visibility: "public" | "private"
    files: SnippetEditorFile[]
  }
  /** 服务端校验错误，键为 "title" | "files" | `filename-${i}` | `content-${i}`。 */
  errors?: Record<string, string>
  /** 提交按钮文案，例如 "创建" / "保存修改"。 */
  submitLabel: string
}

/**
 * 编辑中的文件比服务端多带一个稳定 key：受控 input 靠 key 复用 DOM，
 * 删除中间某个文件时后面的输入框才不会串行。
 */
type EditorFile = SnippetEditorFile & { key: string }

const CONTENT_PLACEHOLDER = [
  "// 在这里粘贴或编写代码",
  "export function greet(name: string) {",
  "  return `你好，${name}！`;",
  "}"
].join("\n")

function createFile(): EditorFile {
  return { key: crypto.randomUUID(), filename: "", content: "" }
}

function initialFiles(initial: SnippetEditorProps["initial"]): EditorFile[] {
  const files = initial?.files ?? []
  return files.length > 0
    ? files.map((file) => ({ ...createFile(), ...file }))
    : [createFile()]
}

export function SnippetEditor({
  initial,
  errors,
  submitLabel
}: SnippetEditorProps) {
  const navigation = useNavigation()
  const isSubmitting = navigation.state !== "idle"

  const [title, setTitle] = useState(initial?.title ?? "")
  const [isPublic, setIsPublic] = useState(initial?.visibility !== "private")
  const [files, setFiles] = useState<EditorFile[]>(() => initialFiles(initial))
  /** 底部字符数跟着最近聚焦的文件走，默认第一个；用户删掉它时回落到第一个。 */
  const [activeKey, setActiveKey] = useState<string | null>(null)

  const activeFile = files.find((file) => file.key === activeKey) ?? files[0]
  const canAddFile = files.length < MAX_FILES_PER_SNIPPET
  const canRemoveFile = files.length > 1

  const patchFile = (key: string, patch: Partial<SnippetEditorFile>) => {
    setFiles((prev) =>
      prev.map((file) => (file.key === key ? { ...file, ...patch } : file))
    )
  }

  const addFile = () => {
    if (!canAddFile) return
    const file = createFile()
    setFiles((prev) => [...prev, file])
    setActiveKey(file.key)
  }

  const removeFile = (key: string) => {
    if (!canRemoveFile) return
    setFiles((prev) => prev.filter((file) => file.key !== key))
    setActiveKey((prev) => (prev === key ? null : prev))
  }

  const titleError = errors?.title
  const filesError = errors?.files

  return (
    <Form method="post" className="flex flex-col gap-8">
      <FieldGroup className="gap-6">
        <Field data-invalid={titleError ? true : undefined}>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor="title">标题</FieldLabel>
            <span className="text-xs text-muted-foreground tabular-nums">
              {title.length} / {MAX_TITLE_LENGTH}
            </span>
          </div>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={MAX_TITLE_LENGTH}
            placeholder="给这个片段起个名字（可选）"
            aria-invalid={titleError ? true : undefined}
          />
          <FieldDescription>
            留空也能保存，列表里会显示为“未命名片段”。
          </FieldDescription>
          {titleError ? <FieldError>{titleError}</FieldError> : null}
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="visibility">
              {isPublic ? "公开" : "私密"}
            </FieldLabel>
            <FieldDescription>
              公开：任何人拿到链接都能查看；私密：仅自己和管理员可见。
            </FieldDescription>
          </FieldContent>
          <Switch
            id="visibility"
            checked={isPublic}
            onCheckedChange={setIsPublic}
          />
          {/* 表单只认这一个字段值，Switch 本身不参与提交 */}
          <input
            type="hidden"
            name="visibility"
            value={isPublic ? "public" : "private"}
          />
        </Field>
      </FieldGroup>

      <FieldSet className="gap-4">
        <FieldLegend>文件</FieldLegend>

        {filesError ? (
          <Alert variant="destructive">
            <WarningCircleIcon />
            <AlertTitle>文件有问题</AlertTitle>
            <AlertDescription>{filesError}</AlertDescription>
          </Alert>
        ) : null}

        <FieldGroup className="gap-4">
          {files.map((file, index) => {
            const filenameError = errors?.[`filename-${index}`]
            const contentError = errors?.[`content-${index}`]

            return (
              <Card key={file.key} size="sm">
                <CardHeader>
                  <CardTitle>文件 {index + 1}</CardTitle>
                  <CardAction>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="删除文件"
                      disabled={!canRemoveFile}
                      onClick={() => removeFile(file.key)}
                    >
                      <TrashIcon />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {/* filename 必须渲染在 content 之前：服务端按 getAll 的下标配对 */}
                  <Field data-invalid={filenameError ? true : undefined}>
                    <FieldLabel htmlFor={`filename-${index}`}>
                      文件名
                    </FieldLabel>
                    <Input
                      id={`filename-${index}`}
                      name="filename"
                      value={file.filename}
                      onChange={(event) =>
                        patchFile(file.key, { filename: event.target.value })
                      }
                      onFocus={() => setActiveKey(file.key)}
                      maxLength={MAX_FILENAME_LENGTH}
                      placeholder="index.ts"
                      className="font-mono"
                      aria-invalid={filenameError ? true : undefined}
                    />
                    {filenameError ? (
                      <FieldError>{filenameError}</FieldError>
                    ) : null}
                  </Field>
                  <Field data-invalid={contentError ? true : undefined}>
                    <FieldLabel htmlFor={`content-${index}`}>内容</FieldLabel>
                    <Textarea
                      id={`content-${index}`}
                      name="content"
                      value={file.content}
                      onChange={(event) =>
                        patchFile(file.key, { content: event.target.value })
                      }
                      onFocus={() => setActiveKey(file.key)}
                      rows={14}
                      placeholder={CONTENT_PLACEHOLDER}
                      className="font-mono text-sm"
                      aria-invalid={contentError ? true : undefined}
                    />
                    {contentError ? (
                      <FieldError>{contentError}</FieldError>
                    ) : null}
                  </Field>
                </CardContent>
              </Card>
            )
          })}
        </FieldGroup>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addFile}
            disabled={!canAddFile}
          >
            <PlusIcon data-icon="inline-start" />
            添加文件
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
            <span>
              {files.length} / {MAX_FILES_PER_SNIPPET} 个文件
            </span>
            <span
              className={
                activeFile.content.length > MAX_FILE_LENGTH
                  ? "text-destructive"
                  : undefined
              }
            >
              {activeFile.content.length} / {MAX_FILE_LENGTH} 字符
            </span>
          </div>
        </div>
      </FieldSet>

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <CircleNotchIcon
              data-icon="inline-start"
              className="animate-spin"
            />
          ) : null}
          {isSubmitting ? "提交中…" : submitLabel}
        </Button>
      </div>
    </Form>
  )
}
