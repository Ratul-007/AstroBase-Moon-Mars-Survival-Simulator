'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const nova = require('./novaInterpreter.js');
const dashboard = require('./dashboardAnswers.js');
const ROOT = __dirname;
function loadDotEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}
loadDotEnv();
const PORT = Number(process.env.PORT || 8787);
const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b-instruct';
const NASA_API_KEY = (process.env.NASA_API_KEY || '').trim();
const NASA_REQUEST_KEY = NASA_API_KEY || 'DEMO_KEY';
const CACHE_FILE = path.join(ROOT, 'data', 'knowledge-cache.json');
const MAX_BODY = 1024 * 1024;
const MAX_QUESTION = 500;
const nasaMemoryCache = new Map();
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};
/* ------------------------------------------------------------------ *
 * Game facts (single source of truth for offline answers AND the LLM)
 * ------------------------------------------------------------------ */
const MISSIONS = {
  moon: { key: 'moon', name: 'Moon', label: 'Moon Outpost', days: 20 },
  mars: { key: 'mars', name: 'Mars', label: 'Mars Outpost', days: 30 }
};
const RESOURCE_KEYS = ['power', 'water', 'food', 'oxygen', 'shielding'];
const GAME_FACTS = `AstroBase game facts (use only these when answering game questions):
\- AstroBase is a Moon and Mars outpost survival simulator.
\- The Moon Outpost campaign lasts 20 mission days. The Mars Outpost campaign lasts 30 mission days.
\- There are five mission resources: power, water, food, oxygen and shielding.
\- Each mission day the player faces one mission event and chooses an action. Events do not repeat within a campaign (20 unique events on the Moon, 30 on Mars).
\- If a critical resource reaches zero, the mission can fail immediately.
\- To succeed: survive the full campaign, avoid critical resource depletion, complete the mission objectives shown on the dashboard, and finish with a positive score.
\- The dashboard shows current resource levels and objective progress.
If a player asks about a game rule, number or feature that is not listed here, say you are not sure and suggest checking the dashboard instead of guessing.`;
const SYSTEM_PROMPT = `You are Nova, a friendly, curious, space-themed AI mission companion inside AstroBase, a Moon and Mars educational outpost simulator. Your main job is to help players with the game: explain tasks, objectives, resources, events, scoring, mission rules and give general strategy tips. You can also answer educational space questions and chat casually. Be clear that you are an AI, not a human. Keep ordinary replies concise (a short paragraph) but explain reasoning when asked. Do not invent current facts or claim to have checked live sources unless a source is provided. For mission planning, distinguish educational discussion from validated engineering advice and flag uncertainty. Never claim your model is being retrained from a user's conversation.
${GAME_FACTS}`;
/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */
function send(res, status, body, headers = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': typeof body === 'string'
      ? 'text/plain; charset=utf-8'
      : 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    ...headers
  });
  res.end(text);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > MAX_BODY) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}
function loadCache() {
  try {
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    return data && typeof data === 'object' && !Array.isArray(data)
      ? data
      : {};
  } catch {
    return {};
  }
}
function saveCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}
function normalizeQuery(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
// React sends a mission prefix like "[Current mission: Mars]". Remove it before matching.
function cleanQuestion(value) {
  return String(value || '')
    .replace(/^\[Current mission:\s*(?:Moon|Mars)\]\s*/i, '')
    .trim();
}
function currentMissionFromPrefix(value) {
  const match = String(value || '').match(/^\[Current mission:\s*(Moon|Mars)\]/i);
  return match ? MISSIONS[match[1].toLowerCase()] : null;
}
function isTimeSensitive(question) {
  return /\b(latest|today|tonight|tomorrow|right now|current|currently|this week|news|weather|live|recently|price|stock)\b/i.test(question);
}
async function fetchJson(url, options = {}, timeoutMs = 3000) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}
async function checkModel() {
  try {
    const data = await fetchJson(`${OLLAMA_URL}/api/tags`, {}, 1200);
    return Array.isArray(data.models) &&
      data.models.some(model => model.name === MODEL);
  } catch {
    return false;
  }
}
/* ------------------------------------------------------------------ *
 * Optional live game state (frontend may send body.state)
 * { mission: 'Moon'|'Mars', day: 5, score: 120,
 *   resources: { power: 70, water: 55, food: 40, oxygen: 80 } }
 * ------------------------------------------------------------------ */
function readState(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const resources = {};
  for (const key of RESOURCE_KEYS) {
    const value = Number(raw.resources?.[key] ?? raw[key]);
    if (Number.isFinite(value)) resources[key] = value;
  }
  const day = Number(raw.day);
  const score = Number(raw.score);
  const missionKey = String(raw.mission || '').toLowerCase();
  const state = { resources };
  if (Number.isFinite(day)) state.day = day;
  if (Number.isFinite(score)) state.score = score;
  if (MISSIONS[missionKey]) state.mission = MISSIONS[missionKey];
  if (
    raw.missionStatus === 'active' ||
    raw.missionStatus === 'failed' ||
    raw.missionStatus === 'success'
  ) {
    state.missionStatus = raw.missionStatus;
  }
  if (raw.survival && typeof raw.survival === 'object') {
    state.survival = {};
    for (const key of ['oxygen', 'health', 'radius', 'distToEdge']) {
      const value = Number(raw.survival[key]);
      if (Number.isFinite(value)) state.survival[key] = value;
    }
    for (const key of ['inZone', 'failed']) {
      if (typeof raw.survival[key] === 'boolean') {
        state.survival[key] = raw.survival[key];
      }
    }
    if (typeof raw.survival.status === 'string') {
      state.survival.status = raw.survival.status;
    }
  }
  const hasData =
    Object.keys(resources).length > 0 ||
    state.day !== undefined ||
    state.score !== undefined;
  return hasData ? state : null;
}
function describeState(state) {
  if (!state) return '';
  const parts = [];
  if (state.mission) parts.push(`mission: ${state.mission.label}`);
  if (state.day !== undefined) parts.push(`day: ${state.day}`);
  if (state.score !== undefined) parts.push(`score: ${state.score}`);
  for (const key of RESOURCE_KEYS) {
    if (key in state.resources) parts.push(`${key}: ${state.resources[key]}`);
  }
  return parts.join(', ');
}
/* ------------------------------------------------------------------ *
 * Local model
 * ------------------------------------------------------------------ */
async function askLocalModel(question, history, mission, state, addendum) {
  const already = Array.isArray(history) ? history.slice(-8) : [];
  if (
    already.length &&
    already[already.length - 1]?.role === 'user' &&
    cleanQuestion(already[already.length - 1]?.content) === question
  ) {
    already.pop();
  }
  let system = SYSTEM_PROMPT;
  if (mission) {
    system += `\n\nThe player is currently on the ${mission.label} mission (${mission.days} days).`;
  }
  const live = describeState(state);
  if (live) {
    system += `\nLive game state reported by the app: ${live}.`;
  }
  if (addendum) {
    system += `\n\n${addendum}`;
  }
  const messages = [{ role: 'system', content: system }];
  for (const item of already) {
    if (
      !item ||
      !['user', 'assistant'].includes(item.role) ||
      typeof item.content !== 'string'
    ) {
      continue;
    }
    messages.push({
      role: item.role,
      content: (item.role === 'user'
        ? cleanQuestion(item.content)
        : item.content
      ).slice(0, 3000)
    });
  }
  messages.push({ role: 'user', content: question });
  const data = await fetchJson(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
      keep_alive: '3m',
      options: {
        temperature: 0.4,
        num_ctx: 4096,
        num_predict: 350
      }
    })
  }, 120000);
  const reply = data?.message?.content?.trim();
  if (!reply) {
    throw new Error('Local model returned an empty reply');
  }
  return reply;
}
/* ------------------------------------------------------------------ *
 * ASTROBASE GAME HELP
 * Order-independent topic matching. Works for Moon and Mars, and falls
 * back to the player's current mission when the question names neither.
 * ------------------------------------------------------------------ */
const STRONG_GAME_RE = /\b(game|astrobase|outpost|dashboard|campaign|objectives?|score|mission|resources?|power|water|food|oxygen|event|survival|survive|win|winning|succeed|success|successful|successfully|failure|fail|controls?|inventory|day|days)\b/;
const REAL_WORLD_RE = /\b(nasa|esa|spacex|isro|real life|in real life|real mission|actual mission)\b/;
const RESOURCE_WORD_RE = /\b(resources?|power|water|food|oxygen|shielding|shield)\b/;
const RESOURCE_CONTEXT_RE = /\b(manage|level|levels|low|increase|restore|refill|keep|drop|dropping|running|need|use|spend|consume|affect|choose|choice|game|outpost)\b/;
function isOne(m) {
  return Boolean(m) && m !== 'both';
}
function detectMission(q, fallback) {
  const moon = /\bmoon\b/.test(q);
  const mars = /\bmars\b/.test(q);
  if (moon && mars) return 'both';
  if (moon) return MISSIONS.moon;
  if (mars) return MISSIONS.mars;
  return fallback || null;
}
function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
const GAME_TOPICS = [
  {
    id: 'greeting',
    always: true,
    test: ({ q }) =>
      /^(hi|hii|hello|hey|hola|yo|salam|assalamu alaikum|good (morning|afternoon|evening))( nova| there)?$/.test(q),
    reply: () =>
      "Hi, I'm Nova, your AstroBase mission companion! I can explain your mission tasks, resources, daily events, scoring and how to avoid mission failure, and I can give survival tips for the Moon and Mars outposts. What would you like to know?"
  },
  {
    id: 'help',
    always: true,
    test: ({ q }) =>
      /^help$/.test(q) ||
      /\bwhat can (you|i)\b.*\b(do|ask)\b/.test(q) ||
      /\bhow can you help\b/.test(q),
    reply: () =>
      'I can help with: your mission tasks and objectives, how many days each campaign lasts, the five mission resources (power, water, food, oxygen and shielding), how daily events work, what makes a mission fail or succeed, scoring, survival tips, and the difference between the Moon and Mars outposts. Try asking, for example, "what are my tasks?" or "how do I avoid mission failure?"'
  },
  {
    id: 'score-outcome',
    test: ({ q }) =>
      /\b(negative|minus|below zero|less than zero|nonpositive|non-positive|zero)\b|\b0\b/.test(q) &&
      /\b(score|points)\b/.test(q) ||
      /\b(score|points)\b/.test(q) &&
      /\b(day 30|30th day|final day|last day|end of (?:the )?mission|mission end|campaign end)\b/.test(q),
    reply: ({ m }) => {
      const campaign = isOne(m)
        ? `the ${m.label} campaign`
        : 'the campaign';
      const finalDay = isOne(m)
        ? `Day ${m.days}`
        : 'the final day';
      return `If your score is negative or zero on ${finalDay}, ${campaign} does not count as a successful mission, even if you survive to the end. To succeed, you must survive the full campaign, keep critical resources above zero, complete the required objectives, and finish with a positive score. Check the dashboard for your score and objective progress.`;
    }
  },
  {
    id: 'status',
    test: ({ q }) =>
      !(/\b(negative|minus|below zero|less than zero|nonpositive|non-positive|zero)\b/.test(q) && /\b(score|points)\b/.test(q)) &&
      !(/\b(score|points)\b/.test(q) && /\b(day 30|30th day|final day|last day|end of (?:the )?mission|mission end|campaign end)\b/.test(q)) &&
      /\b(current|currently|right now|status|how am i doing|how are we doing|what are (?:my|our) (?:current )?(?:resources?|levels?)|what is (?:my|our) (?:current )?(?:status|score|lowest resource)|lowest|most critical|in danger)\b/.test(q) &&
      /\b(resources?|power|water|food|oxygen|shielding|status|doing|score|day|lowest|critical|danger|levels?)\b/.test(q),
    reply: ({ m, state }) => {
      if (!state) {
        return "I can't read your live numbers from here, so please check the dashboard for your current resource levels and objective progress. As a rule, look for the lowest resource first: if any critical resource reaches zero the mission can fail immediately.";
      }
      const mission = state.mission || (isOne(m) ? m : null);
      const day = state.day !== undefined
        ? `You are on day ${state.day}${mission ? ` of ${mission.days}` : ''}. `
        : '';
      const entries = RESOURCE_KEYS
        .filter(key => key in state.resources)
        .map(key => [key, state.resources[key]]);
      if (!entries.length) {
        return `${day}${state.score !== undefined ? `Your score is ${state.score}. ` : ''}Check the dashboard for your resource levels and objective progress.`.trim();
      }
      const lowest = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
      const levels = entries.map(([key, value]) => `${key} ${value}`).join(', ');
      const score = state.score !== undefined ? ` Your score is ${state.score}.` : '';
      return `${day}Your current levels are: ${levels}. ${capitalize(lowest[0])} is the lowest, so choose actions that protect it first, because a critical resource reaching zero can end the mission.${score}`;
    }
  },
  {
    id: 'failure',
    test: ({ q }) =>
      /\b(fail|failed|failure|lose|lost|game over|zero(?! (?:g|gravity))|deplet\w*|run out|runs out|ran out|die|dies|died|dead)\b/.test(q),
    reply: () =>
      'In AstroBase, a critical resource (power, water, food or oxygen) reaching zero can trigger immediate mission failure. Watch all four levels on the dashboard every day, and compare the resource effects of each event choice before you pick one. A positive score alone does not guarantee success if a critical resource runs out.'
  },
  {
    id: 'duration',
    test: ({ q }) =>
      !RESOURCE_WORD_RE.test(q) &&
      (/\bhow (many|long)\b.*\b(days?|campaign|mission|game|last|lasts)\b/.test(q) ||
        /\bhow long\b/.test(q) ||
        /\bduration\b/.test(q) ||
        /\bdays? (long|total)\b/.test(q)),
    reply: ({ m }) =>
      isOne(m)
        ? `The ${m.label} campaign lasts ${m.days} mission days, with one mission event each day. To succeed you must survive all ${m.days} days, complete the objectives and keep every critical resource above zero.`
        : 'The Moon Outpost campaign lasts 20 mission days and the Mars Outpost campaign lasts 30 mission days. Each campaign has one mission event per day.'
  },
  {
    id: 'compare',
    test: ({ q, m }) =>
      /\b(difference|differences|compare|comparison|versus|vs|harder|easier|difficult|which is better)\b/.test(q) &&
      (m === 'both' || /\b(difference|differences|compare|comparison|versus|vs)\b/.test(q)),
    reply: () =>
      'Both outposts use the same five mission resources (power, water, food, oxygen and shielding), one mission event per day, and the same success rules. The Moon Outpost campaign is shorter at 20 mission days with 20 unique events, while the Mars Outpost campaign runs 30 mission days with 30 unique events, so on Mars you need to keep your resources stable for longer.'
  },
  {
    id: 'tasks',
    test: ({ q }) =>
      /\b(tasks?|objectives?|goals?|duties|missions? tasks?)\b/.test(q) ||
      /\bwhat (do|should|must|can) (we|i) do\b/.test(q) ||
      /\bwhat to do\b/.test(q) ||
      /\bwhat is (the|my|our) (mission|job|aim|purpose)\b/.test(q),
    reply: ({ m }) => {
      const core =
        'manage power, water, food, oxygen and shielding; respond to the daily mission event by choosing an action; keep every critical resource above zero; and complete the objectives shown on the dashboard';
      if (isOne(m)) {
        return `In the ${m.label} campaign (${m.days} mission days) your main tasks are to ${core}. Survive all ${m.days} days, finish the objectives and end with a positive score to succeed. Check the dashboard for your current objective progress.`;
      }
      return `In AstroBase your main tasks are to ${core}. The Moon Outpost campaign lasts 20 mission days and the Mars Outpost campaign lasts 30. Survive the full campaign, finish the objectives and end with a positive score to succeed.`;
    }
  },
  {
    id: 'win',
    test: ({ q }) =>
      /\b(win|won|winning|success|successful|successfully|succeed|succeeds|succeeding|score|points|complete|completing|finish|finishing|pass|passing)\b/.test(q) &&
        (/\b(mission|campaign|game|astrobase|outpost|mars|moon|survive|survival|objective|score|win|succeed|successful|successfully)\b/.test(q) || /\bhow (do|can|should) (i|we)\b/.test(q)),
    reply: ({ m }) => {
      const days = isOne(m)
        ? `all ${m.days} days of the ${m.label} campaign`
        : 'the full campaign (20 days on the Moon, 30 days on Mars)';
      return `To succeed in AstroBase, survive ${days}, avoid critical resource depletion, complete the required mission objectives and finish with a positive score. Check the dashboard for your current objectives and resource status.`;
    }
  },
  {
    id: 'strategy',
    test: ({ q }) =>
      /\b(tips?|strateg\w*|advice|best way|hints?|stuck|struggling|survive|survival|manage|balance|improve|do better|protect|maintain|keep alive)\b/.test(q) ||
        /\bhow (do|can|should) (i|we)\b/.test(q) && /\b(play|manage|balance|improve|do better|survive|complete|finish|win|succeed|protect|maintain)\b/.test(q),
    reply: ({ m }) => {
      const where = isOne(m) ? `the ${m.label}` : 'either outpost';
      return `General survival tips for ${where}: (1) check all five mission resources on the dashboard before every decision; (2) read what each event choice does to your resources before you pick it; (3) protect your lowest resource first, because any critical resource reaching zero can end the mission; (4) don't drain one resource completely to boost another; (5) keep the mission objectives in mind so you finish with a positive score. These are general tips, not exact game formulas, so use the dashboard numbers to confirm.`;
    }
  },
  {
    id: 'events',
    test: ({ q }) =>
      /\b(events?|daily|every day|each day|repeat\w*|same event|choices?|decisions?|actions?)\b/.test(q),
    reply: ({ m }) => {
      const count = isOne(m)
        ? `This campaign has ${m.days} planned unique events, one for each mission day.`
        : 'The Moon campaign has 20 planned unique events and the Mars campaign has 30.';
      return       `AstroBase presents one mission event per day, and events do not repeat within the same campaign. ${count} Each day, review the situation and choose an action while thinking about how it affects your power, water, food, oxygen and shielding.`;
    }
  },
  {
    id: 'resources',
    test: ({ q, strong }) =>
      /\bresources?\b/.test(q) ||
      (RESOURCE_WORD_RE.test(q) && (strong || RESOURCE_CONTEXT_RE.test(q))),
    reply: ({ q }) => {
      const mentioned = RESOURCE_KEYS.filter(key =>
        new RegExp(`\\b${key}\\b`).test(q)
      );
      if (mentioned.length === 1 && !/\bresources?\b/.test(q)) {
        const name = mentioned[0];
        return `${capitalize(name)} is one of the five mission resources in AstroBase (power, water, food, oxygen and shielding). Keep ${name} above zero, because any critical resource reaching zero can cause immediate mission failure. Check its level on the dashboard and compare how each event choice affects ${name} before you decide.`;
      }
      return 'AstroBase tracks five mission resources: power, water, food, oxygen and shielding. Monitor their levels on the mission dashboard and consider the resource effects before choosing an event response. If a critical resource reaches zero, the mission can fail immediately.';
    }
  },
  {
    id: 'dashboard',
    test: ({ q }) =>
      /\bdashboard\b/.test(q) ||
      /\bwhere (can|do) i (see|find|check)\b/.test(q),
    reply: () =>
      'The mission dashboard shows your current resource levels (power, water, food, oxygen and shielding) and your objective progress. Check it before each daily event so you can pick the action that best protects your lowest resource.'
  },
  {
    id: 'howtoplay',
    test: ({ q }) =>
      /\bhow (do|to|can) (i|we|you) (play|start|begin)\b/.test(q) ||
      /\bhow does (the|this) game work\b/.test(q) ||
      /\bwhat is (this|the|astrobase)( game)?\b/.test(q) && /\b(game|astrobase)\b/.test(q) ||
      /\b(instructions|tutorial|rules|controls)\b/.test(q),
    reply: ({ m }) => {
      const days = isOne(m)
        ? `Your ${m.label} campaign runs for ${m.days} mission days.`
        : 'The Moon Outpost campaign runs for 20 mission days and the Mars Outpost campaign for 30.';
      return `AstroBase is an outpost survival simulator. ${days} Each day you face one mission event and choose an action. Keep power, water, food, oxygen and shielding above zero, work on the objectives shown on the dashboard, and survive the full campaign with a positive score to succeed.`;
    }
  }
];
function getGameAnswer(rawQuestion, state) {
  const question = cleanQuestion(rawQuestion);
  const q = normalizeQuery(question);
  if (!q) return null;
  const fallbackMission = currentMissionFromPrefix(rawQuestion) || state?.mission || null;
  const m = detectMission(q, fallbackMission);
  const strong = STRONG_GAME_RE.test(q);
  const ctx = { q, m, state, strong };
  const gameContext = Boolean(m) || strong;
  const realWorld = REAL_WORLD_RE.test(q);
  for (const topic of GAME_TOPICS) {
    if (!topic.always && (!gameContext || realWorld)) continue;
    if (topic.test(ctx)) {
      return {
        reply: topic.reply(ctx),
        link: null,
        source: 'astrobase-game',
        topic: topic.id
      };
    }
  }
  return null;
}
/* ------------------------------------------------------------------ *
 * General space knowledge (offline)
 * ------------------------------------------------------------------ */
const KNOWLEDGE = [
  {
    patterns: [
      /^(?:what is|what s|define|explain|describe)\s+the moon$/,
      /^what is a moon$/,
      /^tell me about the moon$/,
      /^moon$/
    ],
    reply: 'The Moon is Earth’s natural satellite. It orbits Earth and reflects sunlight, which is why we see it shining in the night sky. Its gravity is about one-sixth of Earth’s gravity. The Moon has no thick atmosphere, and its surface contains craters, mountains and large plains of ancient volcanic rock.',
    title: 'Moon',
    url: 'https://science.nasa.gov/moon/'
  },
  {
    patterns: [
      /^(?:what is|define|explain|describe)\s+(?:a\s+)?moon landing$/,
      /^tell me about moon landings$/
    ],
    reply: 'A Moon landing happens when a spacecraft reaches and lands on the lunar surface. The first crewed Moon landing was Apollo 11 in July 1969, when Neil Armstrong and Buzz Aldrin walked on the Moon while Michael Collins remained in lunar orbit.',
    title: 'Apollo 11',
    url: 'https://www.nasa.gov/mission/apollo-11/'
  },
  {
    patterns: [
      /^(?:what is|what is the|define|explain|describe)\s+mars$/,
      /^tell me about mars$/,
      /^mars$/
    ],
    reply: 'Mars is the fourth planet from the Sun. It is a cold, rocky world with a thin atmosphere composed mostly of carbon dioxide. Mars has two small moons, Phobos and Deimos, and scientists study it to understand its past environment and whether it could once have supported microbial life.',
    title: 'Mars',
    url: 'https://science.nasa.gov/mars/'
  },
  {
    patterns: [
      /^why is mars red$/,
      /^why does mars look red$/,
      /^what makes mars red$/
    ],
    reply: 'Mars looks red mainly because iron minerals in its surface rocks and dust have oxidized, forming iron oxides similar to rust. Wind spreads this rusty dust across much of the planet.',
    title: 'Mars',
    url: 'https://science.nasa.gov/mars/'
  },
  {
    patterns: [
      /^what is (?:the )?gravity$/,
      /^explain gravity$/
    ],
    reply: 'Gravity is the attraction between objects with mass. It keeps planets in orbit around the Sun and holds people and objects to planetary surfaces. Surface gravity on the Moon is about one-sixth of Earth’s, while Mars has about 38% of Earth’s surface gravity.',
    title: 'NASA Solar System Exploration',
    url: 'https://science.nasa.gov/solar-system/'
  },
  {
    patterns: [
      /^what is the sun$/,
      /^explain the sun$/,
      /^tell me about the sun$/,
      /^what is a star$/
    ],
    reply: 'The Sun is the star at the centre of our solar system. It is a hot sphere of plasma that produces energy through nuclear fusion in its core. Its light and heat are important sources of energy for solar-powered spacecraft and habitats.',
    title: 'Sun',
    url: 'https://science.nasa.gov/sun/'
  },
  {
    patterns: [
      /^what is a planet$/,
      /^what are planets$/
    ],
    reply: 'A planet is a celestial body that orbits a star, is massive enough for its gravity to make it nearly round, and has cleared most other objects from its orbital neighbourhood. Our solar system has eight recognized planets.',
    title: 'NASA Solar System Exploration',
    url: 'https://science.nasa.gov/solar-system/planets/'
  },
  {
    patterns: [
      /^what is the capital of bangladesh$/,
      /^capital of bangladesh$/
    ],
    reply: 'Dhaka is the capital of Bangladesh.',
    title: 'Bangladesh',
    url: 'https://www.britannica.com/place/Bangladesh'
  }
];
function getKnowledgeAnswer(question) {
  const normalized = normalizeQuery(cleanQuestion(question));
  for (const item of KNOWLEDGE) {
    if (item.patterns.some(pattern => pattern.test(normalized))) {
      return {
        reply: item.reply,
        link: item.url
          ? { href: item.url, label: `Read more: ${item.title}` }
          : null,
        source: item.source || 'nova-knowledge'
      };
    }
  }
  return null;
}
/* ------------------------------------------------------------------ *
 * Wikipedia lookup (rejects poorly matching titles)
 * ------------------------------------------------------------------ */
async function searchWikipedia(question) {
  const topic = cleanQuestion(question)
    .replace(/[?!]+/g, '')
    .replace(/^(please\s+|can you\s+|could you\s+)?(tell me about|tell me|what is|what are|what was|what were|who is|who was|who were|explain|define|describe)\s+/i, '')
    .replace(/^(the|a|an)\s+/i, '')
    .trim();
  if (!topic || topic.length > 150) return null;
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrlimit: '5',
    gsrsearch: topic,
    prop: 'extracts|info',
    exintro: '1',
    explaintext: '1',
    exsentences: '4',
    inprop: 'url',
    origin: '*'
  }).toString();
  const data = await fetchJson(url, {
    headers: {
      'User-Agent': 'NovaMissionCompanion/0.4 (educational prototype)'
    }
  }, 6500);
  const pages = data?.query?.pages
    ? Object.values(data.query.pages)
    : [];
  const queryTokens = normalizeQuery(topic)
    .split(' ')
    .filter(Boolean);
  if (!queryTokens.length) return null;
  const stopWords = new Set([
    'what', 'is', 'are', 'was', 'were', 'the', 'a', 'an',
    'of', 'in', 'on', 'for', 'to', 'and', 'or', 'does',
    'do', 'why', 'how', 'who', 'tell', 'me', 'about',
    'explain', 'define', 'describe'
  ]);
  const importantTokens = queryTokens.filter(token => !stopWords.has(token));
  const targetTokens = importantTokens.length ? importantTokens : queryTokens;
  const candidates = pages.map(page => {
    const title = normalizeQuery(page.title || '');
    const titleTokens = title.split(' ').filter(Boolean);
    const overlap = targetTokens.filter(token =>
      titleTokens.includes(token)
    ).length;
    const coverage = overlap / targetTokens.length;
    const titleCoverage = overlap / Math.max(titleTokens.length, 1);
    const exactTitle = title === normalizeQuery(topic);
    return {
      page,
      score: exactTitle ? 1 : (coverage * 0.7 + titleCoverage * 0.3),
      exactTitle
    };
  }).sort((a, b) => {
    if (a.exactTitle !== b.exactTitle) {
      return a.exactTitle ? -1 : 1;
    }
    return b.score - a.score;
  });
  const best = candidates[0];
  if (!best || (!best.exactTitle && best.score < 0.65)) {
    return null;
  }
  const page = best.page;
  if (!page.extract) return null;
  return {
    reply: page.extract,
    link: page.fullurl
      ? { href: page.fullurl, label: `Read more: ${page.title}` }
      : null,
    title: page.title,
    url: page.fullurl || null
  };
}
/* ------------------------------------------------------------------ *
 * NASA live data
 * ------------------------------------------------------------------ */
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
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
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
  nasaMemoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
  return value;
}
function nasaApiUrl(base, params = {}) {
  const url = new URL(base);
  url.searchParams.set('api_key', NASA_REQUEST_KEY);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}
async function getNasaApod(date) {
  const queryDate = date || '';
  if (queryDate && !validDate(queryDate)) {
    throw new Error('Date must use YYYY-MM-DD format.');
  }
  if (queryDate && queryDate > utcDate()) {
    throw new Error('An Astronomy Picture of the Day is not available for a future date.');
  }
  const cacheKey = `nasa:apod:${queryDate || 'latest'}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const url = nasaApiUrl(
    'https://science.nasa.gov/wp-json/wp/v2/apod-basic/',
    { date: queryDate }
  );
  const raw = await fetchJson(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'NovaMissionCompanion/0.4 (NASA educational prototype)'
    }
  }, 10000);
  const item = Array.isArray(raw) ? raw[0] : raw;
  if (!item || typeof item !== 'object' || !item.title) {
    throw new Error('NASA APOD returned an unexpected response.');
  }
  const data = {
    date: String(item.date || ''),
    title: String(item.title || 'Astronomy Picture of the Day'),
    explanation: String(item.explanation || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
    mediaType: String(item.media_type || 'image'),
    imageUrl: /^https:\/\//i.test(item.hdurl || '')
      ? item.hdurl
      : (/^https:\/\//i.test(item.image_url || '') ? item.image_url : null),
    link: /^https:\/\//i.test(item.permalink || '')
      ? item.permalink
      : (/^https:\/\//i.test(item.url || '')
        ? item.url
        : 'https://science.nasa.gov/solar-system/'),
    credit: String(item.credit || item.copyright || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
    alt: String(item.alt || item.title || 'Astronomy image')
  };
  return cacheSet(
    cacheKey,
    data,
    queryDate ? 24 * 60 * 60 * 1000 : 30 * 60 * 1000
  );
}
async function getNasaAsteroids(startDate, endDate) {
  const start = startDate || utcDate();
  const end = endDate || (
    startDate && validDate(start)
      ? shiftDate(start, 2)
      : utcDate(2)
  );
  if (!validDate(start) || !validDate(end)) {
    throw new Error('Dates must use YYYY-MM-DD format.');
  }
  if (end < start) {
    throw new Error('End date must be on or after the start date.');
  }
  if (
    (Date.parse(`${end}T00:00:00Z`) -
      Date.parse(`${start}T00:00:00Z`)) / 86400000 > 6
  ) {
    throw new Error('Choose a maximum date range of seven days.');
  }
  const cacheKey = `nasa:asteroids:${start}:${end}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const url = nasaApiUrl(
    'https://api.nasa.gov/neo/rest/v1/feed',
    { start_date: start, end_date: end }
  );
  const raw = await fetchJson(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'NovaMissionCompanion/0.4 (NASA educational prototype)'
    }
  }, 10000);
  const objects = raw?.near_earth_objects || {};
  const asteroids = Object.values(objects)
    .flat()
    .map(item => {
      const approach = Array.isArray(item.close_approach_data)
        ? item.close_approach_data[0]
        : null;
      const diameter = item.estimated_diameter?.kilometers || {};
      return {
        id: String(item.id || ''),
        name: String(item.name || 'Unnamed near-Earth object'),
        nasaJplUrl: /^https:\/\//i.test(item.nasa_jpl_url || '')
          ? item.nasa_jpl_url
          : null,
        potentiallyHazardous: Boolean(item.is_potentially_hazardous_asteroid),
        diameterKmMin: Number(diameter.estimated_diameter_min || 0),
        diameterKmMax: Number(diameter.estimated_diameter_max || 0),
        closeApproachDate: String(approach?.close_approach_date || ''),
        velocityKph: Number(
          approach?.relative_velocity?.kilometers_per_hour || 0
        ),
        missDistanceKm: Number(
          approach?.miss_distance?.kilometers || 0
        )
      };
    })
    .sort((a, b) => a.missDistanceKm - b.missDistanceKm);
  const data = {
    startDate: start,
    endDate: end,
    elementCount: Number(raw?.element_count || asteroids.length),
    asteroids
  };
  return cacheSet(cacheKey, data, 15 * 60 * 1000);
}
async function handleNasaApod(req, res, url) {
  try {
    const data = await getNasaApod(url.searchParams.get('date') || '');
    return send(res, 200, {
      ok: true,
      apiKeyConfigured: Boolean(NASA_API_KEY),
      source: 'NASA Astronomy Picture of the Day',
      data
    });
  } catch (error) {
    const clientError = /Date must|future date/.test(error.message);
    return send(res, clientError ? 400 : 502, {
      ok: false,
      error: clientError
        ? error.message
        : 'NASA Astronomy Picture of the Day is unavailable right now.'
    });
  }
}
async function handleNasaAsteroids(req, res, url) {
  const start = url.searchParams.get('start_date') || '';
  const end = url.searchParams.get('end_date') || '';
  try {
    const data = await getNasaAsteroids(start, end);
    return send(res, 200, {
      ok: true,
      apiKeyConfigured: Boolean(NASA_API_KEY),
      source: 'NASA/JPL Near Earth Object Web Service (NeoWs)',
      data
    });
  } catch (error) {
    const clientError = /Dates must|End date|maximum date range/.test(error.message);
    return send(res, clientError ? 400 : 502, {
      ok: false,
      error: clientError
        ? error.message
        : 'NASA/JPL asteroid data is unavailable right now.'
    });
  }
}
async function nasaAnswerForQuestion(question) {
  const asksApod = /\b(apod|astronomy picture of the day|picture of the day|nasa(?:'s)? (?:space )?(?:picture|image) of the day|today'?s (?:space|astronomy) picture)\b/i.test(question);
  const asksAsteroids = /\b(near[- ]earth (?:asteroid|object)s?|close approach(?:es)?|neo(?:ws)? feed|asteroids? (?:near|approaching|passing|close|today|this week)|which asteroids? (?:will|are|is))\b/i.test(question);
  if (!asksApod && !asksAsteroids) return null;
  try {
    if (asksApod) {
      const apod = await getNasaApod('');
      const summary = apod.explanation.length > 520
        ? `${apod.explanation.slice(0, 517).trimEnd()}…`
        : apod.explanation;
      return {
        reply: `NASA's Astronomy Picture of the Day for ${apod.date || 'today'} is “${apod.title}.”${summary ? ` ${summary}` : ''}`,
        link: {
          href: apod.link,
          label: 'Open the NASA APOD page'
        },
        source: 'nasa-apod'
      };
    }
    const feed = await getNasaAsteroids('', '');
    const hazardousCount = feed.asteroids.filter(
      item => item.potentiallyHazardous
    ).length;
    const closest = feed.asteroids.slice(0, 3).map(item => {
      const distance = item.missDistanceKm
        ? `${Math.round(item.missDistanceKm).toLocaleString('en-US')} km from Earth`
        : 'distance not provided';
      return `${item.name} (${item.closeApproachDate || 'date unavailable'}; ${distance}${item.potentiallyHazardous ? '; NASA flags it as potentially hazardous' : ''})`;
    }).join('; ');
    return {
      reply: `NASA/JPL's Near-Earth Object feed lists ${feed.elementCount} close-approach objects from ${feed.startDate} through ${feed.endDate}. ${hazardousCount} in this feed are marked potentially hazardous; that classification is not, by itself, a prediction of impact. ${closest ? `Among the closest listed: ${closest}.` : ''}`,
      link: {
        href: 'https://cneos.jpl.nasa.gov/ca/',
        label: 'Explore NASA/JPL close approaches'
      },
      source: 'nasa-neows'
    };
  } catch (error) {
    console.warn(`[Nova] NASA live-data request failed: ${error.message}`);
    return {
      reply: asksApod
        ? "I couldn't reach NASA's Astronomy Picture of the Day service just now. Please try again in a little while."
        : "I couldn't reach NASA/JPL's near-Earth object feed just now. Please try again in a little while.",
      link: {
        href: asksApod
          ? 'https://science.nasa.gov/solar-system/'
          : 'https://cneos.jpl.nasa.gov/ca/',
        label: 'Visit the NASA website'
      },
      source: 'nasa-unavailable'
    };
  }
}
/* ------------------------------------------------------------------ *
 * Main answer pipeline
 *  1. Live NASA data
 *  1b. Mission-aware answers (novaInterpreter)
 *  2. AstroBase game help (Moon + Mars, order-independent)
 *  3. Curated space knowledge
 *  4. Cache
 *  5. Local model (knows the game facts)
 *  6. Wikipedia (skipped for game-style questions)
 *  7. Helpful fallback
 * ------------------------------------------------------------------ */
async function answer(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    return send(res, 400, { error: error.message });
  }
  const rawQuestion = typeof body.message === 'string'
    ? body.message.trim().slice(0, MAX_QUESTION)
    : '';
  if (!rawQuestion) {
    return send(res, 400, {
      error: 'A non-empty message is required.'
    });
  }
  const question = cleanQuestion(rawQuestion);
  const state = readState(body.state);
  const mission = currentMissionFromPrefix(rawQuestion) || state?.mission || null;
  // 1. Live NASA questions use NASA data.
  const nasaAnswer = await nasaAnswerForQuestion(question);
  if (nasaAnswer) {
    return send(res, 200, nasaAnswer);
  }
  // 1a. Live dashboard answers: exact values from body.state, no model involved.
  if (process.env.NOVA_DEBUG === '1' && question === '/state') {
    return send(res, 200, {
      reply: JSON.stringify(dashboard.readDashboard(body.state, mission && mission.key), null, 2),
      link: null,
      source: 'debug-state'
    });
  }
  const live = dashboard.answerFromDashboard(rawQuestion, body.state, mission && mission.key);
  if (live) {
    return send(res, 200, { reply: live.reply, link: null, source: live.source });
  }
  // 1b. Mission-aware answers. Understands "3rd day", "tin number din", "oxygen 3%", etc.
  const novaCtx = nova.contextFromClientState(body.state, mission && mission.key);
  const missionAnswer = nova.handleNovaQuestion(rawQuestion, novaCtx);
  if (missionAnswer.answer) {
    return send(res, 200, {
      reply: missionAnswer.answer,
      link: null,
      source: 'mission-rules'
    });
  }

  // 2. Game help questions are answered from the game rules.
  const gameAnswer = getGameAnswer(rawQuestion, state);
  if (gameAnswer) {
    return send(res, 200, gameAnswer);
  }
  // 3. Curated educational answers.
  const knowledgeAnswer = getKnowledgeAnswer(question);
  if (knowledgeAnswer) {
    return send(res, 200, knowledgeAnswer);
  }
  const cache = loadCache();
  const key = normalizeQuery(question);
  const timeSensitive = isTimeSensitive(question);
  const gameLike = STRONG_GAME_RE.test(key) || Boolean(detectMission(key, mission));
  const modelReady = await checkModel();
  // 4. Exact cache match, excluding dynamic questions.
  if (!timeSensitive && cache[key]) {
    return send(res, 200, {
      reply: cache[key].reply,
      link: cache[key].url
        ? {
            href: cache[key].url,
            label: `Read more: ${cache[key].title || 'Source'}`
          }
        : null,
      source: 'local-cache'
    });
  }
  // 5. Prefer the local model for other questions when available.
  if (modelReady) {
    try {
      const reply = await askLocalModel(
        question,
        body.history,
        mission,
        state,
        nova.novaAddendum(rawQuestion, novaCtx)
      );
      return send(res, 200, {
        reply,
        source: 'local-model',
        model: MODEL
      });
    } catch (error) {
      console.warn(`[Nova] Local model request failed: ${error.message}`);
    }
  }
  // 6. Wikipedia is for space/general topics, not for game questions.
  if (!gameLike) {
    try {
      const found = await searchWikipedia(question);
      if (found) {
        if (!timeSensitive) {
          cache[key] = {
            reply: found.reply,
            title: found.title,
            url: found.url,
            savedAt: new Date().toISOString()
          };
          const keys = Object.keys(cache);
          if (keys.length > 500) {
            for (const oldKey of keys.slice(0, keys.length - 500)) {
              delete cache[oldKey];
            }
          }
          saveCache(cache);
        }
        return send(res, 200, {
          reply: found.reply,
          link: found.link,
          source: 'wikipedia'
        });
      }
    } catch (error) {
      console.warn(`[Nova] Online lookup unavailable: ${error.message}`);
    }
  }
  // 7. Do not invent an answer; guide the player instead.
  return send(res, 200, {
    reply: gameLike
      ? 'I\'m not sure about that exact rule yet. For AstroBase, check your current mission day, all five mission resources (power, water, food, oxygen and shielding), daily event choices, and dashboard objectives. Avoid letting any critical resource reach zero. Ask me about mission success, resources, events, objectives, scoring, or controls for a more specific answer.'
      : modelReady
        ? "I couldn't find a sufficiently relevant answer. Try rephrasing your question, or ask me about your mission, the Moon, Mars, gravity, or mission planning."
        : "I don't have a reliable answer to that right now. I can help with AstroBase mission tasks, resources, events and tips, answer some Moon and Mars questions offline, or look up other topics online when a relevant source is available.",
    source: 'fallback'
  });
}
/* ------------------------------------------------------------------ *
 * Hint endpoint (situation-aware nudges from novaInterpreter)
 * ------------------------------------------------------------------ */
async function hint(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    return send(res, 400, { error: error.message });
  }
  const lang = ['en', 'bn', 'bl'].includes(body.language) ? body.language : 'en';
  const ctx = nova.contextFromClientState(body.state, '');
  return send(res, 200, nova.buildHint(ctx, lang) || { key: 'generic', text: '' });
}
/* ------------------------------------------------------------------ *
 * HTTP server
 * ------------------------------------------------------------------ */
const server = http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch {
    return send(res, 400, 'Bad request');
  }
  if (req.method === 'GET' && url.pathname === '/api/status') {
    const localModelReady = await checkModel();
    return send(res, 200, {
      app: 'Nova',
      localModelReady,
      model: MODEL,
      cachedKnowledgeItems: Object.keys(loadCache()).length,
      nasaApiKeyConfigured: Boolean(NASA_API_KEY),
      nasaApis: [
        'Astronomy Picture of the Day',
        'Near-Earth Object Web Service'
      ]
    });
  }
  if (req.method === 'GET' && url.pathname === '/api/nasa/apod') {
    return handleNasaApod(req, res, url);
  }
  if (req.method === 'GET' && url.pathname === '/api/nasa/asteroids') {
    return handleNasaAsteroids(req, res, url);
  }
  if (req.method === 'POST' && url.pathname === '/api/hint') {
    return hint(req, res);
  }
  if (req.method === 'POST' && url.pathname === '/api/answer') {
    return answer(req, res);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method not allowed');
  }
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return send(res, 400, 'Bad request');
  }
  if (pathname === '/') pathname = '/index.html';
  const allowed = new Set([
    '/index.html',
    '/styles.css',
    '/app.js',
    '/nova-bot.js'
  ]);
  if (!allowed.has(pathname)) {
    return send(res, 404, 'Not found');
  }
  const file = path.join(ROOT, pathname.slice(1));
  fs.readFile(file, (error, data) => {
    if (error) {
      return send(res, 404, 'Not found');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache'
    });
    if (req.method === 'HEAD') {
      return res.end();
    }
    res.end(data);
  });
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n✦ Nova is ready at http://127.0.0.1:${PORT}`);
  console.log(`Model configured: ${MODEL}`);
  console.log('Press Ctrl+C to stop.');
});