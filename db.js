import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, "..", "db", "schema.sql");

export const pool = new Pool({
  connectionString: config.databaseUrl
});

export async function initializeDatabase() {
  const schemaSql = await fs.readFile(schemaPath, "utf8");
  await pool.query(schemaSql);
}

export async function upsertSpotifyTokens(tokenSet) {
  const query = `
    INSERT INTO spotify_tokens (
      account_key,
      access_token,
      refresh_token,
      token_type,
      scope,
      expires_at
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (account_key)
    DO UPDATE SET
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      token_type = EXCLUDED.token_type,
      scope = EXCLUDED.scope,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW()
  `;

  const values = [
    "default",
    tokenSet.accessToken,
    tokenSet.refreshToken,
    tokenSet.tokenType,
    tokenSet.scope,
    tokenSet.expiresAt
  ];

  await pool.query(query, values);
}

export async function getSpotifyTokens() {
  const result = await pool.query(
    "SELECT * FROM spotify_tokens WHERE account_key = $1",
    ["default"]
  );

  return result.rows[0] ?? null;
}

export async function upsertRecentTracks(tracks) {
  if (tracks.length === 0) {
    return 0;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const track of tracks) {
      await client.query(
        `
          INSERT INTO spotify_recent_tracks (
            played_at,
            spotify_track_id,
            track_name,
            album_name,
            artist_names,
            duration_ms,
            popularity,
            explicit,
            track_number,
            disc_number,
            spotify_url,
            preview_url,
            track_payload,
            audio_features,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, NOW()
          )
          ON CONFLICT (played_at)
          DO UPDATE SET
            spotify_track_id = EXCLUDED.spotify_track_id,
            track_name = EXCLUDED.track_name,
            album_name = EXCLUDED.album_name,
            artist_names = EXCLUDED.artist_names,
            duration_ms = EXCLUDED.duration_ms,
            popularity = EXCLUDED.popularity,
            explicit = EXCLUDED.explicit,
            track_number = EXCLUDED.track_number,
            disc_number = EXCLUDED.disc_number,
            spotify_url = EXCLUDED.spotify_url,
            preview_url = EXCLUDED.preview_url,
            track_payload = EXCLUDED.track_payload,
            audio_features = EXCLUDED.audio_features,
            updated_at = NOW()
        `,
        [
          track.playedAt,
          track.spotifyTrackId,
          track.trackName,
          track.albumName,
          track.artistNames,
          track.durationMs,
          track.popularity,
          track.explicit,
          track.trackNumber,
          track.discNumber,
          track.spotifyUrl,
          track.previewUrl,
          JSON.stringify(track.trackPayload),
          JSON.stringify(track.audioFeatures)
        ]
      );
    }

    await client.query("COMMIT");
    return tracks.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listRecentTracks(limit = 20) {
  const result = await pool.query(
    `
      SELECT
        t.played_at,
        t.spotify_track_id,
        t.track_name,
        t.album_name,
        t.artist_names,
        t.duration_ms,
        t.popularity,
        t.explicit,
        t.track_number,
        t.disc_number,
        t.spotify_url,
        t.preview_url,
        t.audio_features,
        t.inserted_at,
        t.updated_at,
        t.track_payload->'track'->'artists'->0->>'id' AS first_artist_id,
        a.image_url AS artist_image_url,
        a.genres AS artist_genres
      FROM spotify_recent_tracks t
      LEFT JOIN spotify_artists a
        ON a.spotify_artist_id = t.track_payload->'track'->'artists'->0->>'id'
      ORDER BY t.played_at DESC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows;
}

export async function upsertArtists(artists) {
  if (artists.length === 0) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const a of artists) {
      await client.query(
        `INSERT INTO spotify_artists (spotify_artist_id, name, image_url, genres, popularity)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (spotify_artist_id) DO UPDATE SET
           name = EXCLUDED.name,
           image_url = EXCLUDED.image_url,
           genres = EXCLUDED.genres,
           popularity = EXCLUDED.popularity,
           fetched_at = NOW()`,
        [a.id, a.name, a.imageUrl, a.genres, a.popularity]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getArtistImages(artistIds) {
  if (artistIds.length === 0) return {};

  const result = await pool.query(
    `SELECT spotify_artist_id, image_url FROM spotify_artists
     WHERE spotify_artist_id = ANY($1)`,
    [artistIds]
  );

  const map = {};
  for (const row of result.rows) {
    map[row.spotify_artist_id] = row.image_url;
  }
  return map;
}
