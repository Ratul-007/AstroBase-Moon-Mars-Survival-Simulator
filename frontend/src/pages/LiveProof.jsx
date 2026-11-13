import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LiveProof.css";

// Put VITE_NASA_API_KEY=your_key in frontend/.env (free key: https://api.nasa.gov)
const NASA_KEY = import.meta.env.VITE_NASA_API_KEY || "DEMO_KEY";

// Each mission uses a short list of NASA reference photos so the picture always
// matches the mission. The photo, title and date are still fetched live from NASA.
const MISSIONS = {
  moon: {
    label: "Moon",
    eventName: "Lunar landing-zone survey",
    brief:
      "Before the crew deploys, mission control pulls a reference photo of a lunar landing zone from the NASA archive.",
    source: "Apollo 17, Taurus-Littrow valley",
    ids: [
      "AS17-146-22296",
      "AS17-134-20382",
      "AS17-140-21497",
      "AS17-134-20466",
    ],
  },
  mars: {
    label: "Mars",
    eventName: "Martian terrain recon",
    brief:
      "Before the crew leaves the habitat, mission control pulls a terrain photo from the Curiosity rover archive.",
    source: "Curiosity rover, Mount Sharp, Gale Crater",
    ids: ["PIA16053", "PIA16768", "PIA23898", "PIA19397", "PIA24269"],
  },
};

function hideKey(url) {
  return NASA_KEY === "DEMO_KEY" ? url : url.replace(NASA_KEY, "YOUR_KEY");
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function clock(date) {
  return date.toLocaleTimeString([], { hour12: false });
}

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

// One fetch helper: every call is timed and written to the on-page request log.
async function callApi(label, url, addLog) {
  const started = performance.now();
  const at = new Date();
  let logged = false;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    addLog({
      label,
      url,
      at,
      status: res.status,
      ms: Math.round(performance.now() - started),
      bytes: new Blob([text]).size,
      quota: res.headers.get("x-ratelimit-remaining"),
    });
    logged = true;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return JSON.parse(text);
  } catch (err) {
    if (!logged) {
      addLog({
        label,
        url,
        at,
        status: "ERR",
        ms: Math.round(performance.now() - started),
        bytes: 0,
        quota: null,
      });
    }
    throw err;
  }
}

// Looks up one curated NASA image. Tries an exact ID match first, then a text search.
async function fetchCurated(id, addLog) {
  const base = "https://images-api.nasa.gov/search";
  let json = await callApi(
    "NASA Image Library",
    `${base}?nasa_id=${encodeURIComponent(id)}`,
    addLog
  );
  let items = json.collection?.items || [];

  if (!items.length) {
    json = await callApi(
      "NASA Image Library",
      `${base}?q=${encodeURIComponent(id)}&media_type=image`,
      addLog
    );
    items = (json.collection?.items || []).filter((i) =>
      i.data?.[0]?.nasa_id?.toLowerCase().includes(id.toLowerCase())
    );
  }

  const item = items.find((i) => i.links?.[0]?.href && i.data?.[0]);
  if (!item) throw new Error(`${id} was not found`);
  return { item, json };
}

function RawJson({ data }) {
  const pretty = JSON.stringify(data, null, 2);
  const limit = 3500;
  return (
    <details className="liveproof-raw">
      <summary>View raw API response</summary>
      <pre>
        {pretty.length > limit
          ? `${pretty.slice(0, limit)}\n... (truncated, full response is in the Network tab)`
          : pretty}
      </pre>
    </details>
  );
}

export default function LiveProof() {
  const navigate = useNavigate();
  const [mission, setMission] = useState("moon");
  const [photo, setPhoto] = useState({ state: "loading" });
  const [neo, setNeo] = useState({ state: "loading" });
  const [simulate, setSimulate] = useState(false);
  const [log, setLog] = useState([]);
  const idRef = useRef(0);
  const didInit = useRef(false);

  const addLog = useCallback((entry) => {
    idRef.current += 1;
    setLog((prev) => [{ id: idRef.current, ...entry }, ...prev].slice(0, 20));
  }, []);

  const loadPhoto = useCallback(
    async (key) => {
      setPhoto({ state: "loading" });
      let lastError;
      for (const id of shuffle(MISSIONS[key].ids).slice(0, 3)) {
        try {
          const { item, json } = await fetchCurated(id, addLog);
          setPhoto({
            state: "ok",
            item,
            json,
            source: MISSIONS[key].source,
          });
          return;
        } catch (err) {
          lastError = err;
        }
      }
      setPhoto({
        state: "error",
        message: lastError?.message || "No image returned",
      });
    },
    [addLog]
  );

  const loadNeo = useCallback(async () => {
    setNeo({ state: "loading" });
    try {
      const today = new Date().toISOString().slice(0, 10);
      const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${NASA_KEY}`;
      const json = await callApi("NASA NeoWs (asteroids)", url, addLog);
      const list = Object.values(json.near_earth_objects || {}).flat();
      const ranked = list
        .map((o) => ({
          o,
          km: parseFloat(o.close_approach_data?.[0]?.miss_distance?.kilometers),
        }))
        .filter((x) => !Number.isNaN(x.km))
        .sort((a, b) => a.km - b.km);
      if (!ranked.length) throw new Error("No asteroid data for today");
      setNeo({
        state: "ok",
        count: json.element_count ?? list.length,
        closest: ranked[0].o,
        hazardCount: list.filter((o) => o.is_potentially_hazardous_asteroid)
          .length,
        json,
      });
    } catch (err) {
      setNeo({ state: "error", message: err.message });
    }
  }, [addLog]);

  useEffect(() => {
    if (didInit.current) return; // avoids a double request in React StrictMode
    didInit.current = true;
    loadPhoto("moon");
    loadNeo();
  }, [loadPhoto, loadNeo]);

  const selectMission = (key) => {
    setMission(key);
    loadPhoto(key);
  };

  const reloadAll = () => {
    loadPhoto(mission);
    loadNeo();
  };

  const m = MISSIONS[mission];
  const lastFetch = log[0]?.at;

  const item = photo.state === "ok" ? photo.item : null;
  const meta = item?.data?.[0];
  const thumb = item?.links?.[0]?.href;
  const medium = thumb?.replace("~thumb", "~medium");
  const title =
    meta?.title && meta.title.length > 120
      ? `${meta.title.slice(0, 120)}...`
      : meta?.title;
  const description = meta?.description
    ? meta.description.replace(/<[^>]+>/g, "")
    : "";

  const closest = neo.state === "ok" ? neo.closest : null;
  const approach = closest?.close_approach_data?.[0];
  const diameter = closest?.estimated_diameter?.meters?.estimated_diameter_max;
  const realAlert = neo.state === "ok" && neo.hazardCount > 0;
  const simulatedAlert = !realAlert && simulate;

  let outcomeClass = "is-clear";
  let outcomeTitle = "No event triggered: sky clear";
  let outcomeText =
    "NASA flagged no hazardous objects today, so the game skips the debris warning.";
  if (realAlert) {
    outcomeClass = "is-alert";
    outcomeTitle = "Event triggered: debris warning";
    outcomeText =
      "NASA flagged at least one hazardous object today, so the game raises a debris warning and asks the crew to check shield integrity.";
  } else if (simulatedAlert) {
    outcomeClass = "is-sim";
    outcomeTitle = "Event triggered: debris warning (simulated)";
    outcomeText =
      "Demo only. NASA reported no hazardous objects today, so this alert is simulated to show what players see. It is not NASA data.";
  }

  return (
    <div className="liveproof-page">
      <header className="liveproof-header">
        <button
          type="button"
          className="liveproof-brand"
          onClick={() => navigate("/")}
        >
          <span className="liveproof-brand-mark">A</span>
          <span>
            <strong>ASTROBASE</strong>
            <small>PLANETARY SURVIVAL PROGRAM</small>
          </span>
        </button>
        <div className="liveproof-live" aria-live="polite">
          <span className="liveproof-dot" />
          {lastFetch ? `LIVE DATA, LAST FETCH ${clock(lastFetch)}` : "CONNECTING"}
        </div>
      </header>

      <section className="liveproof-intro">
        <p className="liveproof-eyebrow">MISSION CONTROL / LIVE PROOF</p>
        <h1>
          Real NASA data, <span>loaded live.</span>
        </h1>
        <p className="liveproof-lead">
          This page calls NASA servers from your browser right now. Nothing here
          is stored in the game. Every request is listed below, and you can
          check each one in your browser Network tab.
        </p>

        <div className="liveproof-controls">
          <div className="liveproof-toggle" role="group" aria-label="Mission">
            {Object.entries(MISSIONS).map(([key, value]) => (
              <button
                key={key}
                type="button"
                aria-pressed={mission === key}
                className={mission === key ? "is-active" : ""}
                onClick={() => selectMission(key)}
              >
                {value.label} mission
              </button>
            ))}
          </div>
          <button type="button" className="liveproof-reload" onClick={reloadAll}>
            Reload live data
          </button>
        </div>
      </section>

      <section className="liveproof-grid">
        <article className="liveproof-card">
          <div className="liveproof-card-head">
            <span>MISSION EVENT</span>
            <span>SOURCE: images-api.nasa.gov</span>
          </div>
          <h2>{m.eventName}</h2>
          <p className="liveproof-muted">{m.brief}</p>

          {photo.state === "loading" && (
            <div className="liveproof-placeholder">Requesting NASA image...</div>
          )}

          {photo.state === "error" && (
            <div className="liveproof-error">
              Request failed: {photo.message}.{" "}
              <button type="button" onClick={() => loadPhoto(mission)}>
                Try again
              </button>
            </div>
          )}

          {item && (
            <>
              <figure className="liveproof-figure">
                <img
                  src={medium}
                  alt={title}
                  onError={(e) => {
                    if (e.currentTarget.dataset.fallback) return;
                    e.currentTarget.dataset.fallback = "1";
                    e.currentTarget.src = thumb;
                  }}
                />
                <figcaption>
                  Archive photo fetched from NASA just now. The title, ID and
                  date below come from the API response.
                </figcaption>
              </figure>

              <dl className="liveproof-facts">
                <div>
                  <dt>Title</dt>
                  <dd>{title}</dd>
                </div>
                <div>
                  <dt>NASA ID</dt>
                  <dd>{meta.nasa_id}</dd>
                </div>
                <div>
                  <dt>Date created</dt>
                  <dd>{meta.date_created?.slice(0, 10) || "n/a"}</dd>
                </div>
                <div>
                  <dt>NASA center</dt>
                  <dd>{meta.center || "n/a"}</dd>
                </div>
                <div>
                  <dt>Reference set</dt>
                  <dd>{photo.source}</dd>
                </div>
              </dl>

              {description && (
                <p className="liveproof-muted">
                  {description.length > 240
                    ? `${description.slice(0, 240)}...`
                    : description}
                </p>
              )}

              <a
                className="liveproof-link"
                href={`https://images.nasa.gov/details/${meta.nasa_id}`}
                target="_blank"
                rel="noreferrer"
              >
                Open this image on images.nasa.gov ↗
              </a>
              <RawJson data={photo.json} />
            </>
          )}
        </article>

        <article className="liveproof-card">
          <div className="liveproof-card-head">
            <span>HAZARD CHECK</span>
            <span>SOURCE: api.nasa.gov / NeoWs</span>
          </div>
          <h2>Near-Earth asteroid watch</h2>
          <p className="liveproof-muted">
            Asteroid data for today (UTC), fetched live from NASA. AstroBase
            uses it to decide whether a debris warning appears in the mission.
          </p>

          {neo.state === "loading" && (
            <div className="liveproof-placeholder">Requesting NASA data...</div>
          )}

          {neo.state === "error" && (
            <div className="liveproof-error">
              Request failed: {neo.message}. If this says HTTP 429, the shared
              demo key hit its limit. Add your own free key (see the note under
              the request log).{" "}
              <button type="button" onClick={loadNeo}>
                Try again
              </button>
            </div>
          )}

          {neo.state === "ok" && closest && (
            <>
              <dl className="liveproof-facts">
                <div>
                  <dt>Objects tracked today</dt>
                  <dd>{neo.count}</dd>
                </div>
                <div>
                  <dt>Closest object</dt>
                  <dd>{closest.name}</dd>
                </div>
                <div>
                  <dt>Miss distance</dt>
                  <dd>
                    {Number(approach.miss_distance.kilometers).toLocaleString(
                      undefined,
                      { maximumFractionDigits: 0 }
                    )}{" "}
                    km ({Number(approach.miss_distance.lunar).toFixed(1)} lunar
                    distances)
                  </dd>
                </div>
                <div>
                  <dt>Speed</dt>
                  <dd>
                    {Number(
                      approach.relative_velocity.kilometers_per_second
                    ).toFixed(1)}{" "}
                    km/s
                  </dd>
                </div>
                <div>
                  <dt>Estimated size</dt>
                  <dd>up to {Math.round(diameter)} m</dd>
                </div>
                <div>
                  <dt>Flagged hazardous by NASA</dt>
                  <dd>
                    {neo.hazardCount} of {neo.count}
                  </dd>
                </div>
              </dl>

              <div className={`liveproof-outcome ${outcomeClass}`}>
                <strong>{outcomeTitle}</strong>
                <p>{outcomeText}</p>
                <small>
                  The data is NASA data. The rule that turns it into a game
                  event is AstroBase game logic.
                </small>
              </div>

              {!realAlert && (
                <button
                  type="button"
                  className="liveproof-sim"
                  aria-pressed={simulate}
                  onClick={() => setSimulate((s) => !s)}
                >
                  {simulate ? "Turn off simulation" : "Simulate hazard (demo)"}
                </button>
              )}

              <a
                className="liveproof-link"
                href={closest.nasa_jpl_url}
                target="_blank"
                rel="noreferrer"
              >
                Open this object on NASA JPL ↗
              </a>
              <RawJson data={neo.json} />
            </>
          )}
        </article>
      </section>

      <section className="liveproof-card liveproof-log">
        <div className="liveproof-card-head">
          <span>REQUEST LOG</span>
          <span>Every call this page made</span>
        </div>

        <div className="liveproof-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Source</th>
                <th>Request</th>
                <th>Status</th>
                <th>Time taken</th>
                <th>Size</th>
              </tr>
            </thead>
            <tbody>
              {log.length === 0 && (
                <tr>
                  <td colSpan={6}>No requests yet.</td>
                </tr>
              )}
              {log.map((entry) => (
                <tr key={entry.id}>
                  <td>{clock(entry.at)}</td>
                  <td>{entry.label}</td>
                  <td className="liveproof-url">
                    <a href={entry.url} target="_blank" rel="noreferrer">
                      GET {hideKey(entry.url)}
                    </a>
                  </td>
                  <td
                    className={
                      entry.status === 200 ? "liveproof-ok" : "liveproof-bad"
                    }
                  >
                    {entry.status}
                  </td>
                  <td>{entry.ms} ms</td>
                  <td>{formatBytes(entry.bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {NASA_KEY === "DEMO_KEY" && (
          <p className="liveproof-note">
            This page is using the shared NASA demo key, which has a low
            request limit. The photo card does not need a key. For stable
            asteroid data, add a free personal key as VITE_NASA_API_KEY.
          </p>
        )}

        <div className="liveproof-verify">
          <h3>Verify it yourself</h3>
          <ol>
            <li>Press F12 and open the Network tab.</li>
            <li>Choose the Fetch/XHR filter.</li>
            <li>Click Reload live data on this page.</li>
            <li>
              Click a request such as search or feed, then open Response to see
              the JSON that NASA sent.
            </li>
          </ol>
        </div>
      </section>

      <footer className="liveproof-footer">
        <button type="button" onClick={() => navigate("/")}>
          Back to home
        </button>
        <p>
          Images and data courtesy of NASA. AstroBase is not endorsed by NASA.
        </p>
      </footer>
    </div>
  );
}