import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { config } from "./config.js";
import { initializeDatabase, listRecentTracks, getArtistImages, pool } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  createAuthorizationUrl,
  exchangeCodeForToken,
  getCurrentProfile,
  validateAuthorizationState
} from "./spotify.js";
import { syncRecentlyPlayed } from "./sync.js";

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", async (_request, response) => {
  const dbCheck = await pool.query("SELECT NOW() AS now");
  response.json({
    ok: true,
    databaseTime: dbCheck.rows[0].now
  });
});

app.get("/auth/login", (_request, response) => {
  const authorization = createAuthorizationUrl();
  response.json({
    message: "Open this URL in the browser and approve Spotify access.",
    state: authorization.state,
    authorizationUrl: authorization.url
  });
});

app.get("/auth/callback", async (request, response, next) => {
  try {
    const { code, error } = request.query;
    const state = String(request.query.state || "");

    if (error) {
      response.status(400).json({ error: String(error) });
      return;
    }

    if (!code) {
      response.status(400).json({ error: "Missing authorization code." });
      return;
    }

    if (!validateAuthorizationState(state)) {
      response.status(400).json({ error: "Invalid or expired OAuth state." });
      return;
    }

    await exchangeCodeForToken(String(code));
    const profile = await getCurrentProfile();

    response.json({
      message: "Spotify authorization completed.",
      spotifyUser: {
        id: profile.id,
        displayName: profile.display_name
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post("/sync/recently-played", async (request, response, next) => {
  try {
    const { limit, after, before } = request.body ?? {};
    const result = await syncRecentlyPlayed({
      limit: Number(limit || 20),
      after,
      before
    });

    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/tracks/recent", async (request, response, next) => {
  try {
    const limit = Number(request.query.limit || 20);
    const tracks = await listRecentTracks(limit);
    response.json({
      count: tracks.length,
      items: tracks
    });
  } catch (error) {
    next(error);
  }
});

app.get("/artists/images", async (request, response, next) => {
  try {
    const ids = String(request.query.ids || "").split(",").filter(Boolean);
    const images = await getArtistImages(ids);
    response.json(images);
  } catch (error) {
    next(error);
  }
});

app.get("/tracks/stats", async (request, response, next) => {
  try {
    const limit = Number(request.query.limit || 50);
    const tracks = await listRecentTracks(limit);

    const artistCount = {};
    const genreCount = {};
    const hourCount = Array(24).fill(0);

    for (const track of tracks) {
      const artists = track.artist_names ?? [];
      for (const artist of artists) {
        artistCount[artist] = (artistCount[artist] || 0) + 1;
      }
      const genres = track.artist_genres ?? [];
      for (const genre of genres) {
        genreCount[genre] = (genreCount[genre] || 0) + 1;
      }
      const hour = new Date(track.played_at).getHours();
      hourCount[hour]++;
    }

    const topArtists = Object.entries(artistCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    const avgDuration = tracks.length
      ? Math.round(tracks.reduce((sum, t) => sum + (t.duration_ms || 0), 0) / tracks.length)
      : 0;

    const avgPopularity = tracks.length
      ? Math.round(tracks.reduce((sum, t) => sum + (t.popularity || 0), 0) / tracks.length)
      : 0;

    const topGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    response.json({
      totalTracks: tracks.length,
      avgDurationMs: avgDuration,
      avgPopularity,
      topArtists,
      topGenres,
      listeningByHour: hourCount
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({
    error: error.message || "Internal server error"
  });
});

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // co 5 minut

async function runAutoSync() {
  try {
    const result = await syncRecentlyPlayed({ limit: 50 });
    console.log(`[auto-sync] Zapisano ${result.savedCount} nowych utworów.`);
  } catch (error) {
    console.error("[auto-sync] Błąd:", error.message);
  }
}

async function startServer() {
  await initializeDatabase();

  app.listen(config.port, () => {
    console.log(`Spotify JSON API listening on http://127.0.0.1:${config.port}`);
  });

  setInterval(runAutoSync, AUTO_SYNC_INTERVAL_MS);
  console.log(`[auto-sync] Uruchomiony — sync co ${AUTO_SYNC_INTERVAL_MS / 1000 / 60} minut.`);
}

startServer().catch((error) => {
  console.error("Failed to start application", error);
  process.exit(1);
});
