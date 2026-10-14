const COLLECTION_LINE = /^Collection:\s*(.+)$/i

/** Parses `Collection:Birds I like` (space after colon optional). */
export function collectionNameFromLine(line: string): string | null {
  const match = line.trim().match(COLLECTION_LINE)
  if (!match) return null
  const name = match[1].trim()
  return name || null
}

export function isCollectionLine(line: string): boolean {
  return collectionNameFromLine(line) !== null
}

export function formatCollectionLine(name: string): string {
  return `Collection:${name.trim()}`
}

export const COLLECTION_LOOKUP_PREFIX = '__collection__:'
