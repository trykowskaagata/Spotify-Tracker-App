# Spotify Data Pipeline

Backendowa aplikacja do automatycznego zbierania, przetwarzania i wizualizacji historii słuchania z Spotify.

Projekt stanowi rozwinięcie wcześniejszego podejścia opartego na statycznych plikach JSON (Spotify Data Access Request). Zamiast analizować zamknięty zbiór danych, system działa w trybie **ciągłym** — automatycznie pobiera dane z API i buduje własne archiwum w bazie danych.

---

## CEL

Celem projektu było stworzenie **w pełni zautomatyzowanego pipeline’u danych**, który:

- eliminuje ręczne przetwarzanie plików JSON  
- zapewnia **ciągłą aktualizację danych**  
- rozszerza dane Spotify o dodatkowe metadane (niedostępne w standardowym eksporcie)  
- umożliwia łatwą analizę i wizualizację historii słuchania  

---

## ARCHITEKTURA
Spotify Web API
↓
Data Fetching & Processing
↓
PostgreSQL (JSONB)
↓
REST API
↓
Dashboard (Chart.js)

---

## Kluczowe funkcjonalności

### Integracja z Spotify API
- Autoryzacja użytkownika (OAuth 2.0)
- Automatyczne odświeżanie tokenów (refresh tokens)
- Pobieranie:
  - historii odtworzeń
  - metadanych utworów i artystów

---

###  Automatyczny pipeline danych
- pełna automatyzacja przepływu danych
- transformacja surowego JSON → struktura relacyjna
- zapis do bazy w czasie rzeczywistym

---

###  Auto-sync
- synchronizacja co **5 minut**
- brak potrzeby ręcznego uruchamiania
- system działa niezależnie od frontendu

---

###  Przechowywanie danych (PostgreSQL, JSONB)
- trwałe przechowywanie historii odsłuchów
- wykorzystanie **JSONB** do:
  - zachowania pełnego payloadu API
  - elastycznej analizy danych
- indeksowane kolumny dla wydajnych zapytań

---

###  REST API
Aplikacja udostępnia własne endpointy, które zwracają:

- statystyki słuchania
- historię odtworzeń
- dane artystów (obrazy, gatunki, popularność)

---

### Dashboard
Wizualizacja danych w przeglądarce przy użyciu **Chart.js**:

- top artyści i gatunki  
- aktywność słuchania (godziny / dni tygodnia)  
- lista ostatnio odtwarzanych utworów  

---

## Schemat bazy danych

### `spotify_recent_tracks` (historia odtworzeń)

| Kolumna | Opis |
|--------|------|
| played_at | Data i godzina odtworzenia (PK) |
| spotify_track_id | ID utworu |
| track_name | Nazwa utworu |
| album_name | Nazwa albumu |
| artist_names | Lista artystów |
| duration_ms | Długość utworu |
| popularity | Popularność (0–100) |
| explicit | Czy zawiera treści explicit |
| track_number | Numer utworu |
| spotify_url | Link do Spotify |
| track_payload | Surowy JSON (JSONB) |

---

### `spotify_artists` (dane o artystach)

| Kolumna | Opis |
|--------|------|
| spotify_artist_id | ID artysty |
| name | Nazwa |
| image_url | Zdjęcie |
| genres | Gatunki |
| popularity | Popularność (0–100) |

---

## Szczegóły implementacyjne

- **Deduplication:** unikalność rekordów na podstawie `played_at`
- **ETL w locie:** mapowanie danych podczas pobierania
- **Background workers:** niezależny proces synchronizacji
- **OAuth persistence:** automatyczne odnawianie tokenów (bez re-logowania)

---
Projekt pokazuje praktyczne wykorzystanie:

- projektowania pipeline’ów danych  
- integracji z zewnętrznym API  
- pracy z PostgreSQL i JSONB  
- budowy backendu + API  
- tworzenia systemów działających w tle  

---

## Pomysły:

- analiza rekomendacji (ML / clustering)
- eksport danych do CSV  
- system alertów (np. nowe top tracks)  
- deployment (Docker + CI/CD)  
