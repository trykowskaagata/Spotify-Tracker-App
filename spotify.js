import crypto from "node:crypto";
import { config } from "./config.js";
import { getSpotifyTokens, upsertSpotifyTokens } from "./db.js";

const SPOTIFY_ACCOUNTS_BASE_URL = "https://accounts.spotify.com";
const SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1";
const validStates = new Map();

function createBasicAuthHeader() {
  const credentials = Buffer.from(
    `${config.spotifyClientId}:${config.spotifyClientSecret}`
  ).toString("base64");

  return `Basic ${credentials}`;
}

function buildTokenSet(payload, existingTokens) {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || existingTokens?.refresh_token,
    tokenType: payload.token_type || "Bearer",
    scope: payload.scope || existingTokens?.scope || config.spotifyScopes.join(" "),
    expiresAt: new Date(Date.now() + payload.expires_in * 1000)
  };
}

async function requestSpotifyToken(params) {
  const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE_URL}/api/token`, {
    method: "POST",
    headers: {
      Authorization: createBasicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams(params)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Spotify token request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export function createAuthorizationUrl() {
  const state = crypto.randomBytes(16).toString("hex");
  validStates.set(state, Date.now() + 10 * 60 * 1000);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.spotifyClientId,
    scope: config.spotifyScopes.join(" "),
    redirect_uri: config.spotifyRedirectUri,
    state
  });

  return {
    state,
    url: `${SPOTIFY_ACCOUNTS_BASE_URL}/authorize?${params.toString()}`
  };
}

export function validateAuthorizationState(state) {
  const expiresAt = validStates.get(state);

  if (!expiresAt) {
    return false;
  }

  validStates.delete(state);
  return expiresAt > Date.now();
}

export async function exchangeCodeForToken(code) {
  const payload = await requestSpotifyToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.spotifyRedirectUri
  });

  const tokenSet = buildTokenSet(payload, null);
  await upsertSpotifyTokens(tokenSet);
  return tokenSet;
}

export async function refreshAccessToken() {
  const tokens = await getSpotifyTokens();

  if (!tokens?.refresh_token) {
    throw new Error("Spotify refresh token is missing. Authorize the application first.");
  }

  const payload = await requestSpotifyToken({
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token
  });

  const tokenSet = buildTokenSet(payload, tokens);
  await upsertSpotifyTokens(tokenSet);
  return tokenSet;
}

async function getValidAccessToken() {
  const tokens = await getSpotifyTokens();

  if (!tokens) {
    throw new Error("Spotify tokens not found. Open /auth/login first.");
  }

  const expiresAt = new Date(tokens.expires_at).getTime();
  const shouldRefresh = expiresAt - Date.now() < 60_000;

  if (shouldRefresh) {
    const refreshed = await refreshAccessToken();
    return refreshed.accessToken;
  }

  return tokens.access_token;
}

async function spotifyApiRequest(pathname, searchParams = {}) {
  const accessToken = await getValidAccessToken();
  const url = new URL(`${SPOTIFY_API_BASE_URL}${pathname}`);

  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Spotify API request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function getRecentlyPlayed({ limit = 20, after, before } = {}) {
  return spotifyApiRequest("/me/player/recently-played", {
    limit,
    after,
    before
  });
}

export async function getAudioFeaturesByTrackIds(trackIds) {
  if (trackIds.length === 0) {
    return {};
  }

  const chunks = [];

  for (let index = 0; index < trackIds.length; index += 100) {
    chunks.push(trackIds.slice(index, index + 100));
  }

  const featuresByTrackId = {};

  for (const chunk of chunks) {
    const payload = await spotifyApiRequest("/audio-features", {
      ids: chunk.join(",")
    });

    for (const feature of payload.audio_features ?? []) {
      if (feature?.id) {
        featuresByTrackId[feature.id] = feature;
      }
    }
  }

  return featuresByTrackId;
}

export async function getArtistsByIds(artistIds) {
  if (artistIds.length === 0) return [];

  const all = [];

  for (let i = 0; i < artistIds.length; i += 50) {
    const chunk = artistIds.slice(i, i + 50);
    const payload = await spotifyApiRequest("/artists", {
      ids: chunk.join(",")
    });
    all.push(...(payload.artists ?? []));
  }

  return all;
}

export async function getCurrentProfile() {
  return spotifyApiRequest("/me");
}
