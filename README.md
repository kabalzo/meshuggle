# Meshuggle 🎸

Guess the Meshuggah song from a 2-second Spotify preview clip.

## Setup

### 1. Get Spotify API credentials

1. Go to https://developer.spotify.com/dashboard
2. Log in with your Spotify account (free account works)
3. Click **Create app**
   - App name: `Meshuggle` (or anything)
   - Redirect URI: `http://localhost:8888` (required but unused)
   - Check **Web API**
4. Click **Settings** → copy your **Client ID** and **Client Secret**

### 2. Configure environment variables

**For local dev:**
```bash
cp .env.example .env
# Edit .env and paste your Client ID and Secret
```

**For Netlify (production):**
1. Go to your Netlify site → **Site configuration** → **Environment variables**
2. Add two variables:
   - `SPOTIFY_CLIENT_ID` = your client ID
   - `SPOTIFY_CLIENT_SECRET` = your client secret

### 3. Deploy to Netlify

**Option A — Netlify CLI (recommended for local dev too):**
```bash
npm install
npx netlify login
npx netlify init       # link to your Netlify account/site
npx netlify dev        # run locally at http://localhost:8888
npx netlify deploy --prod  # deploy to production
```

**Option B — Drag and drop:**
1. Zip the entire `meshuggle/` folder
2. Go to https://app.netlify.com → drag the zip onto your team dashboard
3. Add the environment variables in site settings (see step 2 above)
4. Trigger a redeploy from the Netlify dashboard

**Option C — GitHub:**
1. Push this folder to a GitHub repo
2. In Netlify: **Add new site** → **Import from Git** → select your repo
3. Build settings:
   - Build command: *(leave blank)*
   - Publish directory: `public`
4. Add environment variables, then deploy

## How it works

```
Browser                    Netlify Functions           Spotify
  |                               |                       |
  |-- GET /.netlify/functions/ -->|                       |
  |     spotify-preview           |-- POST /token ------->|
  |                               |<-- access_token ------|
  |                               |-- GET /search ------->|
  |<-- { preview_url } ----------|<-- track results ------|
  |                               |                       |
  |-- <audio src=preview_url> --> Spotify CDN (direct)
```

- Your Spotify client secret **never reaches the browser**
- Preview URLs are cached 24h by Netlify's CDN
- The access token is fetched fresh per function call (cached 55 min)
- Audio plays directly from Spotify's CDN — no proxying

## Notes on previews

Spotify provides 30-second preview clips for most (but not all) tracks.
Older or more obscure Meshuggah tracks may not have previews — the game
will show a warning and let you skip those rounds. The more popular albums
(obZen, Koloss, Immutable, Chaosphere) have near-100% preview coverage.
