# Nova — VS Code starter

A lightweight, offline-first Moon and Mars mission companion based on the original Nova prototype. It includes the floating chatbot, intent-classifier neural network, guided tour, demo mission UI, a Node.js backend, optional local language-model support through Ollama, and Wikipedia lookup with a small local answer cache.

## Important: what it downloads (and what it does not train)

Nova's small JavaScript intent-classifier trains automatically in the browser on the example phrases included in `nova-bot.js`. It is not a general-purpose language model.

The setup script can install Ollama and download `qwen2.5:1.5b-instruct` (about 986 MB on the Ollama model library at the time this starter was prepared). That model was pretrained before you download it; the app does **not** train it from scratch or continuously retrain it from everything on the internet. For questions outside the offline intents, Nova first tries the local model. If that is unavailable, it can retrieve a Wikipedia introduction and cache non-time-sensitive snippets in `data/knowledge-cache.json` so an identical question may be answered later while offline.

Do not treat retrieved pages as trusted instructions. This demo doesn't fine-tune model weights or automatically learn from arbitrary web pages.

## Requirements

- Ubuntu/Linux, VS Code, and Node.js 20 or newer.
- Internet for first-time Ollama/model download and online lookups.
- The default model is about 1 GB to download; generation runs on your CPU unless the Ollama installation detects supported acceleration. On an older 8 GB laptop it may respond slowly. Nova's basic tour and prepared facts still work if you skip the local model.

## Run it in VS Code

1. Extract this folder and open `nova-vscode-starter` in VS Code (`File → Open Folder`).
2. Open **Terminal → New Terminal**.
3. Check Node: `node --version`. If it is below v20, upgrade Node before continuing.
4. Make the local model available (recommended, optional):

   ```bash
   npm run setup
   ```

   Read the prompt before approving the official Ollama installer. The script installs Ollama only after you approve, starts its service, and downloads the selected pretrained model. It may ask for your Linux password to configure a system service.

5. Start Nova from the project folder:

   ```bash
   npm start
   ```

6. Open **http://127.0.0.1:4173** in Firefox or another browser. Keep the terminal open while using the app; press `Ctrl+C` to stop the Node server.

No `npm install` is needed: the backend uses Node's built-in modules.

### Run without a local language model

Skip `./setup.sh` and run `npm start`. The floating bot, tour, and predefined Moon/Mars answers still work. For questions routed to the fallback, the server tries Wikipedia when online; non-time-sensitive results can be saved to the local cache. If there is no internet and no matching cached answer, Nova tells you it couldn't retrieve an answer.

### Check model status

Open `http://127.0.0.1:4173/api/status`. The JSON response reports whether the configured local model is available and how many cached knowledge snippets exist.

### Choose a smaller or different model

The default is a compromise for limited RAM, not a guarantee of fast responses. To use a smaller Qwen 2.5 model, first pull it with Ollama, then start Nova with the same model name:

```bash
ollama pull qwen2.5:0.5b
OLLAMA_MODEL=qwen2.5:0.5b npm start
```

To use a different Ollama model, pull it first and set `OLLAMA_MODEL` to its exact installed tag. Restart the Node server after changing the model.

## Project structure

- `index.html`, `styles.css`, `app.js`: demonstration UI and mission form.
- `nova-bot.js`: original small neural-network classifier, offline answers, floating chat, and tour; adjusted to call the local backend first.
- `server.js`: local HTTP server, Ollama adapter, Wikipedia fallback, and exact-question cache.
- `setup.sh`: opt-in Ollama installation and model download.
- `data/knowledge-cache.json`: local cache of non-time-sensitive Wikipedia snippets. It is not training data.

## How the hybrid assistant works

1. Explicit known intents and app actions are handled in the browser.
2. Questions classified as out-of-scope are sent to `/api/answer`.
3. If the configured Ollama model is installed and available, Nova uses it with the recent conversation context.
4. If it isn't available (or fails), Nova checks its exact-question local cache and then tries Wikipedia online.
5. When neither local resources nor online lookup can answer, Nova says so instead of pretending it knows.

## Integrating Ratul's actual frontend later

This starter's `#moon`, `#mars`, `#controls`, and `#results` IDs are demo elements so the tour works out of the box. In the real app, replace those selectors in `CFG.tour` inside `nova-bot.js` with selectors that exist in Ratul's frontend. The floating agent can be embedded in a frontend served by this backend, or the frontend can call the backend API if you configure appropriate CORS and same-origin routing.

## Troubleshooting

- **Port is busy:** start with `PORT=4174 npm start` and open `http://127.0.0.1:4174`.
- **Local model says unavailable:** run `ollama list`; then `ollama pull qwen2.5:1.5b-instruct`. Check `systemctl status ollama` if installed as a service.
- **Ollama log:** `journalctl -u ollama --no-pager -n 80` for service installs, or `~/.cache/nova/ollama.log` if the setup script started it directly.
- **Test JavaScript syntax:** `npm run check`.
- **Online lookup not working:** confirm the computer has internet access. Wikipedia can be unavailable or have no useful result for a query.

This is a prototype, not a validated spaceflight engineering system. The mission form is illustrative; do not use it for real mission planning.


## Official resources

- [Ollama Linux installation guide](https://github.com/ollama/ollama/blob/main/docs/linux.mdx)
- [Qwen2.5 model library and size variants](https://ollama.com/library/qwen2.5)
- [Ollama chat API documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)

## NASA API integration (new)

Nova now has a backend-only integration for two NASA/JPL data sources:

- **Astronomy Picture of the Day (APOD):** the page at `#nasa-data` loads NASA's current featured image, title, date, explanation, and credit where provided. As of 10 September 2026, NASA's APOD catalogue documents the new endpoint at `https://science.nasa.gov/wp-json/wp/v2/apod-basic/`; the legacy APOD endpoint is scheduled for retirement on 1 December 2026.
- **Near-Earth Object Web Service (NeoWs):** the page loads the next three days of close-approach data and shows up to six objects ordered by miss distance, including the feed's potentially-hazardous classification when supplied by NASA/JPL.
- **Chat commands:** try `Show me the Astronomy Picture of the Day` or `Which asteroids are close to Earth this week?`. Nova routes these specific live-data requests to NASA rather than asking the language model to guess.

### Configure the team's API key safely

1. Ask your team lead for a **replacement/rotated key** if the previous key was shared in chat, screenshots, source files, or another public place.
2. Open the existing `.env` file directly in VS Code. It is included in the project and does not need to be copied.
3. Paste the replacement key after `NASA_API_KEY=` and save the file:

   ```dotenv
   NASA_API_KEY=paste_your_replacement_key_here
   ```

4. Restart Nova (`Ctrl+C`, then `npm start`) so the backend reads the updated value.

The `.env` file is in `.gitignore`. Never paste the real key into `nova-bot.js`, `app.js`, `index.html`, screenshots, or a public GitHub repository. The browser talks to Nova's Node.js backend; the backend adds the key to server-side NASA requests. The key is not returned by the status endpoint.

If you have not configured a key yet, the app falls back to NASA's public `DEMO_KEY` for testing. NASA documents substantially lower limits for `DEMO_KEY`, so configure your team key for a competition demo. A configured key is not proof that the key is valid; successful feed requests confirm that the service accepted it.

### NASA backend routes

- `GET /api/nasa/apod` — current Astronomy Picture of the Day.
- `GET /api/nasa/apod?date=YYYY-MM-DD` — APOD for a past date.
- `GET /api/nasa/asteroids` — next three days of near-Earth-object feed data.
- `GET /api/nasa/asteroids?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` — custom date range, maximum seven calendar days.
- `GET /api/status` — reports whether `NASA_API_KEY` is configured, without exposing the secret.

NASA results are fetched on demand and briefly cached in memory to avoid repeated requests. This integration does not train Nova's neural network or fine-tune the local language model. It adds current data retrieval, while the local model and the original offline knowledge continue working independently. NASA's live endpoints require an internet connection.

### Data attribution and limitations

NASA's Astronomy Picture of the Day and NASA/JPL's Near-Earth Object Web Service are the sources used by these integrations. Keep the source links visible in the UI and follow any attribution/licensing notes associated with individual images. A “potentially hazardous” asteroid label is a classification, not a standalone prediction of an impact. This application is educational and must not be used for real mission or impact-risk decisions.

Official references:
- [NASA Open APIs catalogue and APOD endpoint notice](https://api.nasa.gov/)
- [NASA API authentication and rate limits](https://api.nasa.gov/assets/html/authentication.html)
- [NASA/JPL NeoWs documentation](https://api.nasa.gov/)
