# Meshuggle 🎸

A Meshuggah song guessing game. Listen to a 3-second clip and identify the track before racking up 3 outs.

**Live at [meshuggle.com](https://meshuggle.com)**

## How to Play

- Hit **Play clip** to hear a 3-second snippet from a random Meshuggah track
- Search for and submit your guess
- **3 strikes** (wrong guesses) on a single song = **1 out**
- **3 outs** and your game is over — score is how many songs you identified correctly
- **3 skips** per game — skipping reveals the answer with no out penalty
- **Alt clip** unlocks after 2 strikes — plays a different section of the same track
- After the 1st wrong guess, you get an album name hint
- Filter by album to focus on specific parts of the discography
- Submit your score to the global leaderboard at the end

## Tech Stack

| | |
|---|---|
| **Frontend** | Vanilla HTML/CSS/JS, single file |
| **Hosting** | [Netlify](https://netlify.com) |
| **Audio previews** | [iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI) — free, no auth required |
| **Leaderboard** | [Upstash Redis](https://upstash.com) via Netlify serverless function |
| **Built with** | [Claude](https://claude.ai) (Anthropic) |

## Project Structure

```
meshuggle/
├── public/
│   └── index.html          # Entire game — HTML, CSS, and JS in one file
├── netlify/
│   └── functions/
│       ├── leaderboard.js  # GET/POST leaderboard via Upstash Redis
│       └── debug.js        # Diagnostics endpoint for Upstash connectivity
├── netlify.toml            # Netlify build config
├── package.json
└── README.md
```

## Local Development

```bash
npm install
npx netlify login
npx netlify link        # link to your Netlify site
npx netlify dev         # runs at http://localhost:8888
```

## Deployment

Push to the `main` branch — Netlify auto-deploys on every push.

```bash
git add .
git commit -m "your message"
git push
```

## Environment Variables

Set these in **Netlify → Site configuration → Environment variables**:

| Variable | Description |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Your Upstash database REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Your Upstash REST token (mark as secret) |

> **Note:** Upstash auth uses query param style (`?_token=...`) rather than Bearer headers — this is handled automatically in the leaderboard function.

## Diagnostics

If the leaderboard stops working, visit:

```
https://meshuggle.com/.netlify/functions/debug
```

This endpoint tests your Upstash connection live and reports exactly what's failing.

## Discography Coverage

~95 songs across all studio albums and major EPs:

- Contradictions Collapse (1991)
- None EP (1994)
- Destroy Erase Improve (1995)
- The True Human Design EP (1997)
- Chaosphere (1998)
- Nothing (2002)
- I EP (2004)
- Catch Thirtythree (2005)
- obZen (2008)
- Koloss (2012)
- The Violent Sleep of Reason (2016)
- Immutable (2022)

Songs without iTunes preview availability are silently skipped and never dealt to the player.

## License

MIT
