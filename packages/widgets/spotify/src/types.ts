import { z } from "zod";

const spotifyTrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  artist: z.string(),
  imageUrl: z.string().nullable(),
  url: z.string(),
});

const spotifyArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  genres: z.array(z.string()),
  imageUrl: z.string().nullable(),
  url: z.string(),
});

/**
 * The widget's TData contract, and also its own runtime validator (see
 * `Widget.dataSchema` in @pulse/sdk).
 */
export const spotifyDataSchema = z.discriminatedUnion("connected", [
  z.object({ connected: z.literal(false) }),
  z.object({
    connected: z.literal(true),
    tracks: z.array(spotifyTrackSchema),
    topArtist: spotifyArtistSchema.nullable(),
    topGenre: z.string().nullable(),
    fetchedAt: z.string(),
  }),
]);

export type SpotifyData = z.infer<typeof spotifyDataSchema>;
