export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  imageUrl: string | null;
  url: string;
}

interface SpotifyTopTracksResponse {
  items?: {
    id?: string;
    name?: string;
    artists?: { name?: string }[];
    album?: { images?: { url?: string }[] };
    external_urls?: { spotify?: string };
  }[];
}

export async function fetchTopTracks(accessToken: string, limit: number): Promise<SpotifyTrack[]> {
  const url = new URL("https://api.spotify.com/v1/me/top/tracks");
  url.searchParams.set("time_range", "medium_term");
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Spotify top tracks request failed: ${response.status}`);
  }

  const body = (await response.json()) as SpotifyTopTracksResponse;

  return (body.items ?? [])
    .filter(
      (item): item is typeof item & { id: string; name: string } =>
        typeof item.id === "string" && typeof item.name === "string",
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
      artist: (item.artists ?? []).map((artist) => artist.name).filter(Boolean).join(", ") || "Unknown artist",
      imageUrl: item.album?.images?.[0]?.url ?? null,
      url: item.external_urls?.spotify ?? "",
    }));
}
