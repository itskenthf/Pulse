export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  imageUrl: string | null;
  url: string;
}

interface SpotifyTopArtistsResponse {
  items?: {
    id?: string;
    name?: string;
    genres?: string[];
    images?: { url?: string }[];
    external_urls?: { spotify?: string };
  }[];
}

export async function fetchTopArtists(
  accessToken: string,
  limit: number,
): Promise<SpotifyArtist[]> {
  const url = new URL("https://api.spotify.com/v1/me/top/artists");
  url.searchParams.set("time_range", "medium_term");
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Spotify top artists request failed: ${response.status}`);
  }

  const body = (await response.json()) as SpotifyTopArtistsResponse;

  return (body.items ?? [])
    .filter(
      (item): item is typeof item & { id: string; name: string } =>
        typeof item.id === "string" && typeof item.name === "string",
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
      genres: item.genres ?? [],
      imageUrl: item.images?.[0]?.url ?? null,
      url: item.external_urls?.spotify ?? "",
    }));
}

/** Spotify has no "top genre" endpoint — derive it as the most frequent
 *  genre across the already-fetched top artists' own `genres[]` fields.
 *  Ties go to whichever genre appears first (i.e. belongs to the
 *  highest-ranked artist), not sorted arbitrarily. */
export function deriveTopGenre(artists: SpotifyArtist[]): string | null {
  const counts = new Map<string, number>();
  for (const artist of artists) {
    for (const genre of artist.genres) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }

  let topGenre: string | null = null;
  let topCount = 0;
  for (const artist of artists) {
    for (const genre of artist.genres) {
      const count = counts.get(genre) ?? 0;
      if (count > topCount) {
        topCount = count;
        topGenre = genre;
      }
    }
  }

  return topGenre;
}
