import 'server-only'

interface IgdbGame {
  id: number
  name: string
  summary?: string
  coverUrl?: string
  totalRating?: number
  totalRatingCount?: number
  firstReleaseDate?: string
  genres?: string[]
}

let cachedToken: string | null = null
let cachedTokenExpiresAt = 0

async function getTwitchAccessToken() {
  const clientId = process.env.IGDB_CLIENT_ID
  const clientSecret = process.env.IGDB_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Missing IGDB_CLIENT_ID or IGDB_CLIENT_SECRET environment variables')
  }

  const now = Date.now()
  if (cachedToken && now < cachedTokenExpiresAt - 60_000) {
    return cachedToken
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
  })

  const res = await fetch(`https://id.twitch.tv/oauth2/token`, {
    method: 'POST',
    body: params,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to get Twitch access token: ${res.status} ${text}`)
  }

  const data = await res.json() as { access_token: string; expires_in: number }
  cachedToken = data.access_token
  cachedTokenExpiresAt = Date.now() + data.expires_in * 1000

  return cachedToken
}

export async function getPopularIgdbGames(limit = 20): Promise<IgdbGame[]> {
  const clientId = process.env.IGDB_CLIENT_ID
  if (!clientId) {
    throw new Error('Missing IGDB_CLIENT_ID environment variable')
  }

  const accessToken = await getTwitchAccessToken()

  const query = [
    'fields id,name,summary,cover.url,total_rating,total_rating_count,first_release_date,genres.name,platforms.name;',
    // Remove platform restriction to get more games including popular ones like Valorant
    // Just filter by rating count to ensure quality/popularity
    'where total_rating_count != null & total_rating_count > 10;',
    'sort total_rating_count desc;',
    `limit ${Math.min(Math.max(limit, 1), 500)};`,
  ].join(' ')

  const res = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'text/plain',
    },
    body: query,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to fetch IGDB games: ${res.status} ${text}`)
  }

  const raw = await res.json() as any[]

  return raw.map((g) => {
    const coverUrl = g.cover?.url
      ? g.cover.url.replace('t_thumb', 't_cover_big')
      : undefined

    return {
      id: g.id,
      name: g.name,
      summary: g.summary,
      coverUrl,
      totalRating: typeof g.total_rating === 'number' ? g.total_rating : undefined,
      totalRatingCount: typeof g.total_rating_count === 'number' ? g.total_rating_count : undefined,
      firstReleaseDate: g.first_release_date
        ? new Date(g.first_release_date * 1000).toISOString()
        : undefined,
      genres: Array.isArray(g.genres?.map?.((gen: any) => gen.name))
        ? g.genres.map((gen: any) => gen.name)
        : undefined,
    }
  })
}

export type { IgdbGame }
