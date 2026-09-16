export interface PublicCollectionArticle {
  title: string
  description: string
  thumbnail: { url: string; width: number; height: number } | null
}

export async function fetchPublicCollectionArticle(
  title: string,
): Promise<PublicCollectionArticle> {
  const wikiTitle = title.replace(/ /g, '_')

  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`,
    )
    const data = await res.json()
    const thumb = data.thumbnail
    return {
      title: data.title ?? title,
      description: data.description?.trim() || '',
      thumbnail: thumb
        ? { url: thumb.source, width: thumb.width, height: thumb.height }
        : null,
    }
  } catch {
    return {
      title,
      description: '',
      thumbnail: null,
    }
  }
}
