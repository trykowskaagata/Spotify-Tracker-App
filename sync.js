import { upsertRecentTracks, upsertArtists } from "./db.js";
import { getAudioFeaturesByTrackIds, getArtistsByIds, getRecentlyPlayed } from "./spotify.js";

function mapRecentTrack(item, audioFeatures) {
  const track = item.track;

  return {
    playedAt: item.played_at,
    spotifyTrackId: track.id,
    trackName: track.name,
    albumName: track.album?.name ?? null,
    artistNames: (track.artists ?? []).map((artist) => artist.name),
    durationMs: track.duration_ms ?? null,
    popularity: track.popularity ?? null,
    explicit: track.explicit ?? false,
    trackNumber: track.track_number ?? null,
    discNumber: track.disc_number ?? null,
    spotifyUrl: track.external_urls?.spotify ?? null,
    previewUrl: track.preview_url ?? null,
    trackPayload: item,
    audioFeatures: audioFeatures[track.id] ?? null
  };
}

export async function syncRecentlyPlayed({ limit = 20, after, before } = {}) {
  const recentPayload = await getRecentlyPlayed({ limit, after, before });
  const items = recentPayload.items ?? [];

  const uniqueTrackIds = [
    ...new Set(
      items
        .map((item) => item.track?.id)
        .filter(Boolean)
    )
  ];

  const uniqueArtistIds = [
    ...new Set(
      items.flatMap((item) =>
        (item.track?.artists ?? []).map((a) => a.id).filter(Boolean)
      )
    )
  ];

  let audioFeatures = {};

  try {
    audioFeatures = await getAudioFeaturesByTrackIds(uniqueTrackIds);
  } catch {
    console.warn("Audio features unavailable (deprecated for new apps), skipping.");
  }

  try {
    const spotifyArtists = await getArtistsByIds(uniqueArtistIds);
    const mapped = spotifyArtists.filter(Boolean).map((a) => ({
      id: a.id,
      name: a.name,
      imageUrl: a.images?.[1]?.url || a.images?.[0]?.url || null,
      genres: a.genres ?? [],
      popularity: a.popularity ?? null
    }));
    await upsertArtists(mapped);
  } catch (err) {
    console.warn("Artist fetch failed, skipping:", err.message);
  }

  const mappedTracks = items.map((item) => mapRecentTrack(item, audioFeatures));
  const savedCount = await upsertRecentTracks(mappedTracks);

  return {
    savedCount,
    fetchedCount: items.length,
    cursor: recentPayload.cursors ?? null,
    items: mappedTracks
  };
}
