/** 统一的 404：不区分“不存在”和“无权限”，避免被用来枚举资源。 */
export function notFound(): never {
  throw new Response("Not Found", { status: 404, statusText: "Not Found" })
}

/** 400：表单校验失败等可直接回显的错误。 */
export function badRequest(message: string): never {
  throw new Response(message, { status: 400, statusText: "Bad Request" })
}
