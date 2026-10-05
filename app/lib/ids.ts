const HEX = "0123456789abcdef"

/** 密码学安全的随机 ID，默认 32 字节 → 64 个十六进制字符。 */
export function randomId(bytes = 32): string {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes))
  let out = ""
  for (const byte of buffer) out += HEX[byte >> 4] + HEX[byte & 0x0f]
  return out
}

/**
 * slug 字母表：去掉容易混淆的 0/O/1/I/l，共 58 个字符。
 * 10 位 ≈ 4.3e17 种组合，配合唯一索引 + 冲突重试，足够对抗枚举。
 *
 * OAuth 用的 state / PKCE verifier 不在这里生成——它们由 openid-client
 * （oauth4webapi）提供。
 */
const SLUG_ALPHABET =
  "23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"

/** 生成随机 slug（与标题、作者无关，纯随机）。 */
export function randomSlug(length = 10): string {
  const buffer = crypto.getRandomValues(new Uint8Array(length))
  let out = ""
  for (const byte of buffer) out += SLUG_ALPHABET[byte % SLUG_ALPHABET.length]
  return out
}
