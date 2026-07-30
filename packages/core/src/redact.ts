const DEFAULT_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /(?:api[_-]?key|token|secret|password)\s*[:=]\s*["']?([^\s"']+)/gi,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  /https?:\/\/[^\s]*[?&](?:access_token|token|key)=[^\s&]+/gi,
]

export function redactText(input: string, extra: string[] = []): string {
  let out = input
  for (const re of DEFAULT_PATTERNS) out = out.replace(re, '[REDACTED]')
  for (const pat of extra) {
    try {
      out = out.replace(new RegExp(pat, 'gi'), '[REDACTED]')
    } catch {
      // ignore invalid custom patterns
    }
  }
  const home = process.env.HOME || process.env.USERPROFILE
  if (home) out = out.split(home).join('<home>')
  return out
}
