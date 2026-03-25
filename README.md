# Spotify JSON API + PostgreSQL

Prosta aplikacja Node.js, która:

- autoryzuje użytkownika przez Spotify OAuth,
- pobiera ostatnio odtwarzane utwory,
- dociąga parametry audio utworów,
- zapisuje wszystko w PostgreSQL,
- wystawia wynik jako JSON API.

## Wymagania

- Node.js 20+
- PostgreSQL 14+
- konto deweloperskie Spotify: https://developer.spotify.com/dashboard

## Konfiguracja Spotify

1. Utwórz aplikację w Spotify Developer Dashboard.
2. Skopiuj `Client ID` i `Client Secret`.
3. W ustawieniach aplikacji dodaj redirect URI:

```text
http://127.0.0.1:3000/auth/callback
```

## Instalacja

```bash
cd C:\Users\Dom\spotify-json-app
copy .env.example .env
npm install
```

Następnie uzupełnij `.env` swoimi danymi:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/spotify_app
SPOTIFY_CLIENT_ID=twoj_client_id
SPOTIFY_CLIENT_SECRET=twoj_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/auth/callback
```

## Baza danych

Utwórz bazę:

```sql
CREATE DATABASE spotify_app;
```

Tabele utworzą się automatycznie przy starcie aplikacji na podstawie `db/schema.sql`.

## Uruchomienie

```bash
npm run dev
```

## Jak używać

1. Otwórz:

```text
GET http://127.0.0.1:3000/auth/login
```

2. Skopiuj `authorizationUrl` z odpowiedzi JSON i otwórz go w przeglądarce.
3. Zaloguj się do Spotify i zatwierdź dostęp.
4. Spotify przekieruje Cię na:

```text
http://127.0.0.1:3000/auth/callback?code=...
```

5. Po autoryzacji wywołaj synchronizację:

```bash
curl -X POST http://127.0.0.1:3000/sync/recently-played ^
  -H "Content-Type: application/json" ^
  -d "{\"limit\":20}"
```

6. Pobierz zapisane dane:

```text
GET http://127.0.0.1:3000/tracks/recent?limit=20
```

## Przykładowa odpowiedź JSON

```json
{
  "count": 1,
  "items": [
    {
      "played_at": "2026-03-24T10:12:31.000Z",
      "spotify_track_id": "4uLU6hMCjMI75M1A2tKUQC",
      "track_name": "Never Gonna Give You Up",
      "album_name": "Whenever You Need Somebody",
      "artist_names": ["Rick Astley"],
      "duration_ms": 213573,
      "popularity": 78,
      "explicit": false,
      "track_number": 1,
      "disc_number": 1,
      "spotify_url": "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
      "preview_url": null,
      "audio_features": {
        "danceability": 0.727,
        "energy": 0.939,
        "tempo": 113.339,
        "valence": 0.937
      }
    }
  ]
}
```

## Endpointy

- `GET /health`
- `GET /auth/login`
- `GET /auth/callback`
- `POST /sync/recently-played`
- `GET /tracks/recent`

## Uwagi

- Aplikacja przechowuje tokeny i historię odsłuchu w PostgreSQL.
- Synchronizacja zapisuje pełny payload Spotify w kolumnie `track_payload`.
- Parametry audio trafiają do kolumny `audio_features` typu `JSONB`.
