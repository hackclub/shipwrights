export function normalizeRepoUrl(url: string | null | undefined): string | null {
  if (!url) return null

  let key = url.trim().toLowerCase()
  if (!key) return null

  key = key.replace(/^https?:\/\//, '')
  key = key.replace(/^git@github\.com:/, 'github.com/')
  key = key.replace(/\/+$/, '')
  key = key.replace(/\.git$/, '')
  key = key.replace(/^www\./, '')

  if (!key || !key.includes('/')) return null

  return key
}
