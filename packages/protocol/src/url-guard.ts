import { TOKEN_PARAM_KEYS } from './constants.js'

const tokenKeys = new Set<string>(TOKEN_PARAM_KEYS.map((key) => key.toLowerCase()))

function hasTokenParams(params: URLSearchParams): boolean {
  for (const key of params.keys()) {
    if (tokenKeys.has(key.toLowerCase())) {
      return true
    }
  }
  return false
}

/** Detects credential-like query/hash keys. Values are never read or returned. */
export function entryUrlContainsToken(entry: { search: string; hash: string }): boolean {
  const search = entry.search.startsWith('?') ? entry.search.slice(1) : entry.search
  if (search && hasTokenParams(new URLSearchParams(search))) {
    return true
  }

  const hash = entry.hash.startsWith('#') ? entry.hash.slice(1) : entry.hash
  if (!hash) {
    return false
  }

  const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : hash
  return hasTokenParams(new URLSearchParams(query))
}
