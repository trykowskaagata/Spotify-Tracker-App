# Spotify Data Pipeline

Backendowa aplikacja do automatycznego zbierania, przetwarzania i wizualizacji historii słuchania z Spotify.

Projekt stanowi rozwinięcie wcześniejszego podejścia opartego na statycznych plikach JSON (Spotify Data Access Request). Zamiast analizować zamknięty zbiór danych, system działa w trybie **ciągłym** — automatycznie pobiera dane z API i buduje własne archiwum w bazie danych.

---
<img width="546" height="725" alt="spotiwynik" src="https://github.com/user-attachments/assets/f73f2903-ec13-4a97-9174-f79248de5f3f" />

## CEL

Celem projektu było stworzenie **w pełni zautomatyzowanego pipeline’u danych**, który:

- eliminuje ręczne przetwarzanie plików JSON  
- zapewnia **ciągłą aktualizację danych**  
- rozszerza dane Spotify o dodatkowe metadane (niedostępne w standardowym eksporcie)  
- umożliwia łatwą analizę i wizualizację historii słuchania  

---

## ARCHITEKTURA
System działa w modelu ciągłym (Background Worker):
1. **Pobieranie:** Skrypt co 5 minut odpytuje endpoint `currently-playing` oraz `recently-played`.
2. **Przetwarzanie:** Transformacja surowego JSON do ustandaryzowanej struktury relacyjnej.
3. **Składowanie:** Zapis do bazy PostgreSQL (Deduplikacja na podstawie timestampu `played_at`).
4. **Prezentacja:** Frontend pobiera zagregowane dane przez REST API i wyświetla je na dashboardzie.

---

## Funkcje Dashboardu

Strona została podzielona na kluczowe sekcje analityczne:

*   **Sekcja Centralna:** Wyświetla zdjęcie profilowe (`image_url`) oraz nazwę aktualnie najczęściej słuchanego artysty.
*   **Kafelki Top 5:** Trzy równoległe zestawienia generowane na podstawie zapytań SQL:
    *   **Top 5 Utworów** (Ranking według liczby wystąpień w historii).
    *   **Top 5 Artystów** (Ranking na podstawie częstotliwości odtworzeń).
    *   **Top 5 Gatunków** (Agregacja danych z tabeli artystów).
*   **Ostatnio słuchani:** Lista ostatnich sesji z informacją o czasie, jaki upłynął od odtworzenia.


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

## Technologie

- **Backend:** Node.js (Express) / Python.
- **Baza danych:** PostgreSQL.
- **Frontend:** JavaScript (Vanilla/ES6), Chart.js (opcjonalnie do wykresów aktywności).
- **API:** Spotify Web API (OAuth 2.0 z obsługą Refresh Tokens).

---
## Bezpieczeństwo i Konfiguracja

Projekt wymaga pliku konfiguracyjnego `.env` (przechowywanego lokalnie), który zawiera poświadczenia do Spotify API oraz dane dostępowe do bazy PostgreSQL. 

**Plik ten został celowo wykluczony z repozytorium (gitignored)** ze względów bezpieczeństwa. Aby uruchomić projekt, należy stworzyć własny plik `.env` z następującymi zmiennymi:
* `SPOTIFY_CLIENT_ID`
* `SPOTIFY_CLIENT_SECRET`
* `DATABASE_URL`

Z projektu usunięto integrację z *Audio Features* (BPM, Energy itp.), ponieważ Spotify wycofało wsparcie dla tych punktów końcowych (API deprecation). Pipeline skupia się obecnie na stabilnym gromadzeniu historii odtworzeń i metadanych artystów.

---
Projekt pokazuje praktyczne wykorzystanie:

- projektowania pipeline’ów danych  
- integracji z zewnętrznym API  
- pracy z PostgreSQL i JSONB  
- budowy backendu + API  
- tworzenia systemów działających w tle  

---

## Pomysły:

- analiza rekomendacji (ML / clustering),
- analiza czasu słuchania i dodatnie wykresów statystycznych,
- połączenie bazy danych z ogólnodostępną bazą danych dt. parametrów muzycznych np. BPM, danceability, 
- system alertów (np. nowe top tracks),  
- deployment (Docker + CI/CD)  
