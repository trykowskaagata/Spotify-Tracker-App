CREATE TABLE IF NOT EXISTS spotify_tokens (
  account_key TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type TEXT NOT NULL,
  scope TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spotify_recent_tracks (
  id BIGSERIAL PRIMARY KEY,
  played_at TIMESTAMPTZ NOT NULL UNIQUE,
  spotify_track_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  album_name TEXT,
  artist_names TEXT[] NOT NULL,
  duration_ms INTEGER,
  popularity INTEGER,
  explicit BOOLEAN,
  track_number INTEGER,
  disc_number INTEGER,
  spotify_url TEXT,
  preview_url TEXT,
  track_payload JSONB NOT NULL,
  audio_features JSONB,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spotify_recent_tracks_track_id
  ON spotify_recent_tracks (spotify_track_id);

CREATE INDEX IF NOT EXISTS idx_spotify_recent_tracks_played_at
  ON spotify_recent_tracks (played_at DESC);

CREATE TABLE IF NOT EXISTS spotify_artists (
  spotify_artist_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  genres TEXT[],
  popularity INTEGER,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
