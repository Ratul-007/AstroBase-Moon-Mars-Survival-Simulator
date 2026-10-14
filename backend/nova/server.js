'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;

// Minimal .env loader: no third-party dependency required. Existing process
// environment variables take precedence over values in .env.
function loadDotEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}
loadDotEnv();

const PORT = Number(process.env.PORT || 4173);
const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b-instruct';
const NASA_API_KEY = (process.env.NASA_API_KEY || '').trim();
const NASA_REQUEST_KEY = NASA_API_KEY || 'DEMO_KEY';
const CACHE_FILE = path.join(ROOT, 'data', 'knowledge-cache.json');
const MAX_BODY = 1024 * 1024;
const nasaMemoryCache = new Map();

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};
const SYSTEM_PROMPT = `You are Nova, a friendly, curious, space-themed AI mission companion for a Moon and Mars educational simulator. Speak naturally and warmly, including casual greetings and small talk; you do not need to make every conversation about space. Be clear that you are an AI, not a human. Help with the app's tour and educational space topics. Ask a brief follow-up question when useful. Keep ordinary replies concise but explain reasoning when asked. Do not invent current facts or claim to have checked live sources unless a source is provided. For mission planning, distinguish educational discussion from validated engineering advice and flag important uncertainty. Never claim your model is being retrained from a user's conversation.`;

function send(res, status, body, headers = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(text);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > MAX_BODY) { reject(new Error('Request body too large')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}
function loadCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); }
  catch { return {}; }
}
function saveCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}
function normalizeQuery(q) { return String(q || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' '); }
function isTimeSensitive(q) { return /\b(latest|today|tonight|tomorrow|right now|current|currently|this week|news|weather|live|recently|price|stock)\b/i.test(q); }
async function fetchJson(url, options = {}, timeoutMs = 3000) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
async function checkModel() {
  try {
    const data = await fetchJson(`${OLLAMA_URL}/api/tags`, {}, 1200);
    return Array.isArray(data.models) && data.models.some(m => m.name === MODEL);
  } catch { return false; }
}
async function askLocalModel(question, history) {
  const already = Array.isArray(history) ? history.slice(-8) : [];
  // The current question is passed separately, so remove its last duplicate from history.
  if (already.length && already[already.length - 1]?.role === 'user' && already[already.length - 1]?.content === question) already.pop();
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  for (const item of already) {
    if (!item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string') continue;
    messages.push({ role: item.role, content: item.content.slice(0, 3000) });
  }
  messages.push({ role: 'user', content: question });
  const data = await fetchJson(`${OLLAMA_URL}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, stream: false, keep_alive: '3m', options: { temperature: 0.65, num_ctx: 4096, num_predict: 350 } })
  }, 120000);
  const reply = data?.message?.content?.trim();
  if (!reply) throw new Error('Local model returned an empty reply');
  return reply;
}
async function searchWikipedia(question) {
  const topic = question
    .replace(/[?!]+/g, '')
    .replace(/^(please\s+|can you\s+|could you\s+)?(tell me about|tell me|what is|what are|what was|who is|who was|who were|explain|define|describe)\s+/i, '')
    .trim();
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrlimit: '1', gsrsearch: topic,
    prop: 'extracts|info', exintro: '1', explaintext: '1', exsentences: '4', inprop: 'url', origin: '*'
  }).toString();
  const data = await fetchJson(url, { headers: { 'User-Agent': 'NovaMissionCompanion/0.1 (educational prototype)' } }, 6500);
  const page = data?.query?.pages ? Object.values(data.query.pages)[0] : null;
  if (!page?.extract) return null;
  return { reply: page.extract, link: page.fullurl ? { href: page.fullurl, label: `Read more: ${page.title}` } : null, title: page.title, url: page.fullurl || null };
}
function utcDate(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}
function shiftDate(value, offsetDays) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function cacheGet(key) {
  const hit = nasaMemoryCache.get(key);
  if (!hit || hit.expiresAt < Date.now()) {
    nasaMemoryCache.delete(key);
    return null;
  }
  return hit.value;
}
function cacheSet(key, value, ttlMs) {
  nasaMemoryCache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}
function nasaApiUrl(base, params = {}) {
  const url = new URL(base);
  url.searchParams.set('api_key', NASA_REQUEST_KEY);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  return url;
}
async function getNasaApod(date) {
  const queryDate = date || '';
  if (queryDate && !validDate(queryDate)) throw new Error('Date must use YYYY-MM-DD format.');
  if (queryDate && queryDate > utcDate()) throw new Error('An Astronomy Picture of the Day is not available for a future date.');
  const cacheKey = `nasa:apod:${queryDate || 'latest'}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  // NASA migrated APOD to this endpoint on 10 September 2026. The legacy
  // api.nasa.gov APOD service is scheduled for retirement on 1 December 2026.
  const url = nasaApiUrl('https://science.nasa.gov/wp-json/wp/v2/apod-basic/', { date: queryDate });
  const raw = await fetchJson(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'NovaMissionCompanion/0.2 (NASA Space Apps educational prototype)' } }, 10000);
  const item = Array.isArray(raw) ? raw[0] : raw;
  if (!item || typeof item !== 'object' || !item.title) throw new Error('NASA APOD returned an unexpected response.');
  const data = {
    date: String(item.date || ''),
    title: String(item.title || 'Astronomy Picture of the Day'),
    explanation: String(item.explanation || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    mediaType: String(item.media_type || 'image'),
    imageUrl: /^https:\/\//i.test(item.hdurl || '') ? item.hdurl : (/^https:\/\//i.test(item.image_url || '') ? item.image_url : null),
    link: /^https:\/\//i.test(item.permalink || '') ? item.permalink : (/^https:\/\//i.test(item.url || '') ? item.url : 'https://science.nasa.gov/solar-system/'),
    credit: String(item.credit || item.copyright || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    alt: String(item.alt || item.title || 'Astronomy image')
  };
  return cacheSet(cacheKey, data, queryDate ? 24 * 60 * 60 * 1000 : 30 * 60 * 1000);
}
async function getNasaAsteroids(startDate, endDate) {
  const start = startDate || utcDate();
  const end = endDate || (startDate && validDate(start) ? shiftDate(start, 2) : utcDate(2));
  if (!validDate(start) || !validDate(end)) throw new Error('Dates must use YYYY-MM-DD format.');
  if (end < start) throw new Error('End date must be on or after the start date.');
  if ((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000 > 6) {
    throw new Error('Choose a maximum date range of seven days.');
  }
  const cacheKey = `nasa:asteroids:${start}:${end}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = nasaApiUrl('https://api.nasa.gov/neo/rest/v1/feed', { start_date: start, end_date: end });
  const raw = await fetchJson(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'NovaMissionCompanion/0.2 (NASA Space Apps educational prototype)' } }, 10000);
  const objects = raw?.near_earth_objects || {};
  const asteroids = Object.values(objects).flat().map(item => {
    const approach = Array.isArray(item.close_approach_data) ? item.close_approach_data[0] : null;
    const diameter = item.estimated_diameter?.kilometers || {};
    return {
      id: String(item.id || ''),
      name: String(item.name || 'Unnamed near-Earth object'),
      nasaJplUrl: /^https:\/\//i.test(item.nasa_jpl_url || '') ? item.nasa_jpl_url : null,
      potentiallyHazardous: Boolean(item.is_potentially_hazardous_asteroid),
      diameterKmMin: Number(diameter.estimated_diameter_min || 0),
      diameterKmMax: Number(diameter.estimated_diameter_max || 0),
      closeApproachDate: String(approach?.close_approach_date || ''),
      velocityKph: Number(approach?.relative_velocity?.kilometers_per_hour || 0),
      missDistanceKm: Number(approach?.miss_distance?.kilometers || 0)
    };
  }).sort((a, b) => a.missDistanceKm - b.missDistanceKm);
  const data = { startDate: start, endDate: end, elementCount: Number(raw?.element_count || asteroids.length), asteroids };
  return cacheSet(cacheKey, data, 15 * 60 * 1000);
}
async function handleNasaApod(req, res, url) {
  try {
    const data = await getNasaApod(url.searchParams.get('date') || '');
    return send(res, 200, { ok: true, apiKeyConfigured: Boolean(NASA_API_KEY), source: 'NASA Astronomy Picture of the Day', data });
  } catch (error) {
    const clientError = /Date must|future date/.test(error.message);
    return send(res, clientError ? 400 : 502, { ok: false, error: clientError ? error.message : 'NASA Astronomy Picture of the Day is unavailable right now.' });
  }
}
async function handleNasaAsteroids(req, res, url) {
  const start = url.searchParams.get('start_date') || '';
  const end = url.searchParams.get('end_date') || '';
  try {
    const data = await getNasaAsteroids(start, end);
    return send(res, 200, { ok: true, apiKeyConfigured: Boolean(NASA_API_KEY), source: 'NASA/JPL Near Earth Object Web Service (NeoWs)', data });
  } catch (error) {
    const clientError = /Dates must|End date|maximum date range/.test(error.message);
    return send(res, clientError ? 400 : 502, { ok: false, error: clientError ? error.message : 'NASA/JPL asteroid data is unavailable right now.' });
  }
}
async function nasaAnswerForQuestion(question) {
  const asksApod = /\b(apod|astronomy picture of the day|picture of the day|nasa(?:'s)? (?:space )?(?:picture|image) of the day|today'?s (?:space|astronomy) picture)\b/i.test(question);
  const asksAsteroids = /\b(near[- ]earth (?:asteroid|object)s?|close approach(?:es)?|neo(?:ws)? feed|asteroids? (?:near|approaching|passing|close|today|this week)|which asteroids? (?:will|are|is))\b/i.test(question);
  if (!asksApod && !asksAsteroids) return null;
  try {
    if (asksApod) {
      const apod = await getNasaApod('');
      const summary = apod.explanation.length > 520 ? `${apod.explanation.slice(0, 517).trimEnd()}…` : apod.explanation;
      return {
        reply: `NASA's Astronomy Picture of the Day for ${apod.date || 'today'} is “${apod.title}.”${summary ? ` ${summary}` : ''}`,
        link: { href: apod.link, label: 'Open the NASA APOD page' },
        source: 'nasa-apod'
      };
    }
    const feed = await getNasaAsteroids('', '');
    const hazardousCount = feed.asteroids.filter(item => item.potentiallyHazardous).length;
    const closest = feed.asteroids.slice(0, 3).map(item => {
      const distance = item.missDistanceKm ? `${Math.round(item.missDistanceKm).toLocaleString('en-US')} km from Earth` : 'distance not provided';
      return `${item.name} (${item.closeApproachDate || 'date unavailable'}; ${distance}${item.potentiallyHazardous ? '; NASA flags it as potentially hazardous' : ''})`;
    }).join('; ');
    return {
      reply: `NASA/JPL's Near-Earth Object feed lists ${feed.elementCount} close-approach object${feed.elementCount === 1 ? '' : 's'} from ${feed.startDate} through ${feed.endDate}. ${hazardousCount} in this feed are marked potentially hazardous; that classification is not, by itself, a prediction of impact. ${closest ? `Among the closest listed: ${closest}.` : ''}`,
      link: { href: 'https://cneos.jpl.nasa.gov/ca/', label: 'Explore NASA/JPL close approaches' },
      source: 'nasa-neows'
    };
  } catch (error) {
    console.warn(`[Nova] NASA live-data request failed: ${error.message}`);
    return {
      reply: asksApod
        ? "I couldn't reach NASA's Astronomy Picture of the Day service just now. Please try the NASA data panel again in a little while."
        : "I couldn't reach NASA/JPL's near-Earth object feed just now. Please try again in a little while.",
      link: { href: asksApod ? 'https://science.nasa.gov/solar-system/' : 'https://cneos.jpl.nasa.gov/ca/', label: 'Visit the NASA/JPL website' },
      source: 'nasa-unavailable'
    };
  }
}

async function answer(req, res) {
  let body;
  try { body = await readBody(req); }
  catch (error) { return send(res, 400, { error: error.message }); }
  const question = typeof body.message === 'string' ? body.message.trim().slice(0, 300) : '';
  if (!question) return send(res, 400, { error: 'A non-empty message is required.' });

  const nasaAnswer = await nasaAnswerForQuestion(question);
  if (nasaAnswer) return send(res, 200, nasaAnswer);

  const cache = loadCache();
  const key = normalizeQuery(question);
  const modelReady = await checkModel();

  // Keep dynamic questions fresh: do not serve old exact-match cache entries for them.
  if (!isTimeSensitive(question) && cache[key]) {
    return send(res, 200, { reply: cache[key].reply, link: cache[key].url ? { href: cache[key].url, label: `Read more: ${cache[key].title}` } : null, source: 'local-cache' });
  }

  if (modelReady) {
    try {
      const reply = await askLocalModel(question, body.history);
      return send(res, 200, { reply, source: 'local-model', model: MODEL });
    } catch (error) {
      console.warn(`[Nova] Local model request failed: ${error.message}`);
    }
  }

  // If offline, previously retrieved Wikipedia snippets remain available by exact question.
  if (cache[key] && !isTimeSensitive(question)) {
    return send(res, 200, { reply: cache[key].reply, link: cache[key].url ? { href: cache[key].url, label: `Read more: ${cache[key].title}` } : null, source: 'local-cache' });
  }
  try {
    const found = await searchWikipedia(question);
    if (found) {
      if (!isTimeSensitive(question)) {
        cache[key] = { reply: found.reply, title: found.title, url: found.url, savedAt: new Date().toISOString() };
        // Simple bounded cache so repeated exploration does not grow forever.
        const keys = Object.keys(cache);
        if (keys.length > 500) for (const oldKey of keys.slice(0, keys.length - 500)) delete cache[oldKey];
        saveCache(cache);
      }
      return send(res, 200, { reply: found.reply, link: found.link, source: 'wikipedia' });
    }
  } catch (error) {
    console.warn(`[Nova] Online lookup unavailable: ${error.message}`);
  }

  return send(res, 200, { reply: modelReady
    ? "I couldn't get a reliable answer just now. Try rephrasing, or ask me about the Moon, Mars, or mission planning."
    : "I'm in fallback mode: the local language model isn't ready, and I couldn't retrieve an online result. Try again online later, or ask me about the Moon, Mars, or the mission tour.", source: 'fallback' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/status') {
    const localModelReady = await checkModel();
    return send(res, 200, {
      app: 'Nova', localModelReady, model: MODEL,
      cachedKnowledgeItems: Object.keys(loadCache()).length,
      nasaApiKeyConfigured: Boolean(NASA_API_KEY),
      nasaApis: ['Astronomy Picture of the Day', 'Near-Earth Object Web Service']
    });
  }
  if (req.method === 'GET' && url.pathname === '/api/nasa/apod') return handleNasaApod(req, res, url);
  if (req.method === 'GET' && url.pathname === '/api/nasa/asteroids') return handleNasaAsteroids(req, res, url);
  if (req.method === 'POST' && url.pathname === '/api/answer') return answer(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');

  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const allowed = new Set(['/index.html', '/styles.css', '/app.js', '/nova-bot.js']);
  if (!allowed.has(pathname)) return send(res, 404, 'Not found');
  const file = path.join(ROOT, pathname.slice(1));
  fs.readFile(file, (error, data) => {
    if (error) return send(res, 404, 'Not found');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') return res.end();
    res.end(data);
  });
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n✦ Nova is ready at http://127.0.0.1:${PORT}`);
  console.log(`Model configured: ${MODEL}`);
  console.log('Press Ctrl+C to stop.');
});
