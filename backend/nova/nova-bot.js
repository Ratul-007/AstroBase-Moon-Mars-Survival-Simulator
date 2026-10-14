/*! Nova: a tiny offline-first guide bot for the Moon & Mars simulator. No dependencies.
 *  Use:  <script src="nova-bot.js" defer></script>   (or `import './nova-bot.js'` in React/Vue/Vite)
 *  Brain: a small neural network (hashed word + character-trigram features -> 24 tanh units -> softmax) trains in
 *         the browser on the phrases in INTENTS (well under a second). Confident match -> instant offline answer.
 *         Anything else -> your own LLM proxy (optional) or a live Wikipedia lookup.
 */
(() => {
/* ================= 1. EDIT ME: settings, tour steps, knowledge ================= */
const CFG = Object.assign({
  name: 'Nova',
  threshold: 0.55,   // minimum confidence for an offline answer
  wikipedia: true,   // online fallback for off-topic questions (no API key needed)
  llmEndpoint: '/api/answer', // local backend: model first, cached knowledge / Wikipedia next.
  // Tour steps: `sel` is a CSS selector for the element to spotlight. Replace these with Ratul's real selectors.
  // If a selector isn't found, the step still shows its text.
  tour: [
    { title: 'Welcome aboard', text: "I'm Nova, your mission guide. This is a quick tour of the Moon & Mars simulator. Press Next whenever you're ready." },
    { sel: '#moon', title: 'Moon missions', text: 'Start close to home: lunar landings, 1.3-second comms and one-sixth gravity.' },
    { sel: '#mars', title: 'Mars missions', text: 'Mars is the long game: 6 to 9 month transits, thin air and minutes of signal delay.' },
    { sel: '#controls', title: 'Mission controls', text: 'Set crew, supplies and launch window here, then run the simulation.' },
    { sel: '#results', title: 'Results', text: 'See what worked and what failed: oxygen, water, power and radiation.' }
  ]
}, (typeof window !== 'undefined' && window.NOVA_CONFIG) || {});

// intent: ['phrases separated by |', [possible answers]]. More varied phrases = a smarter bot. Answers starting "__" are actions.
const I = {
greet: ['hi|hello|hey|hey there|hello there|good morning|good evening|good afternoon|hola|yo|whats up|sup|howdy|hey nova|hello nova',
  ["Hey there! I'm {n}, your mission companion. How can I help you today?", 'Hello {u}! We can chat, explore space, or take a quick tour. What sounds good?', "Hi! Glad you're here. What's on your mind, explorer?"]],
how_are_you: ['how are you|how are you doing|hows it going|how do you feel|are you ok|how is your day|hope you are well|how have you been',
  ['Running at full power, thanks for asking! How are you doing?', 'Doing well and ready to help. How has your day been?', "All systems nominal! What's on your mind?"]],
smalltalk: ['can we talk|lets chat|let us chat|let us talk|just chatting|i just want to chat|im bored|i am bored|tell me something interesting|what do you like|what are your hobbies|whats your favorite planet|what is your favorite planet|are you friendly',
  ["Of course. We can chat about space, technology, your day, or whatever you're curious about. What's on your mind?", "I'm happiest when I'm helping someone discover something new. Want a fun space fact, or shall we just chat?", "My virtual hobby is exploring questions. Yours doesn't have to be space-related! What would you like to talk about?"]],
who_are_you: ['who are you|what is your name|whats your name|what are you|introduce yourself|are you a robot|are you human|are you an ai|are you real',
  ["I'm {n}, a tiny neural network that lives in this page. I know a lot about the Moon and Mars, and I look up the rest online."]],
thanks: ['thanks|thank you|thanks a lot|thx|ty|appreciate it|cheers|great thanks|thank you so much',
  ['Anytime!', 'Happy to help. Ask away whenever.', "You're welcome!"]],
bye: ['bye|goodbye|see you|see ya|see you later|talk later|i have to go|gotta go|cya|good night',
  ['Safe travels, explorer!', 'See you later. Ad astra!']],
joke: ['tell me a joke|make me laugh|say something funny|got any jokes|joke|tell me a space joke|funny',
  ['Why did the Moon skip dinner? It was already full.', 'What do you call a tick on the Moon? A luna-tick.', 'How do you organize a space party? You planet.']],
help: ['what can you do|help|help me|how can you help|what can i ask|options|commands|what do you know',
  ['I can take you on a tour, explain Moon and Mars facts (gravity, travel time, radiation, life support), chat, or look things up online. Try “tour” or “how long to get to Mars?”']],
compliment: ['you are awesome|nice work|great job|you are smart|i like you|youre cool|good bot|youre amazing|well done',
  ["Aw, thanks! You're not so bad yourself.", 'That made my circuits warm. Thank you!']],
about_app: ['what is this app|what is this website|what does this do|what is this project|about this simulation|what is this about|nasa space apps|explain this app|what is this simulator|what is this site',
  ['This is a Moon & Mars mission simulator built for the NASA Space Apps Challenge. You pick a destination, plan the mission, and see what it takes to survive there. Say “tour” for a walkthrough.']],
nasa_apod: ['astronomy picture of the day|picture of the day|nasa picture of the day|nasa image of the day|show me apod|what is nasa apod|todays astronomy picture|today’s astronomy picture', ['__nasa_apod']],
nasa_asteroids: ['near earth asteroids|near earth objects|asteroids approaching earth|asteroids near earth today|asteroid close approaches|which asteroids are close to earth|show me neows|near earth object feed', ['__nasa_asteroids']],
tour_start: ['take me on a tour|start the tour|show me around|give me a tour|guide me|walkthrough|how do i use this|tour|begin tour|start tour|i am new here|where do i start', ['__tour']],
tour_next: ['next|next step|continue|go on|keep going|ok next|go ahead|next one|move on', ['__next']],
tour_back: ['back|previous|go back|previous step|one step back|last step', ['__back']],
tour_stop: ['stop|end tour|stop the tour|exit tour|skip tour|quit tour|cancel|end the tour|im done', ['__stop']],

moon_basic: ['moon|the moon|lunar|moon facts|tell me about the moon|how far is the moon|how far away is the moon|moon distance|how big is the moon|facts about the moon|what is the moon',
  ["The Moon orbits about 384,400 km from Earth, so light takes 1.3 seconds to get there. It is 3,474 km wide, roughly a quarter of Earth's diameter, with almost no atmosphere."]],
moon_gravity: ['gravity on the moon|moon gravity|can i jump higher on the moon|how much would i weigh on the moon|weight on the moon|lunar gravity|how heavy would i be on the moon',
  ["Lunar gravity is 1.62 m/s², about one-sixth of Earth's. A 60 kg person would feel like 10 kg there, but their mass, and their need for a spacesuit, stays the same."]],
moon_temp: ['how hot is the moon|how cold is the moon|temperature on the moon|moon day length|how long is a lunar day|moon night|is it cold on the moon|lunar night',
  ['With no atmosphere, temperatures swing from about 127 °C in sunlight to -173 °C at night, and below -200 °C in some permanently shadowed polar craters. One full lunar day-night cycle lasts about 29.5 Earth days.']],
moon_water: ['is there water on the moon|lunar ice|water ice on the moon|moon south pole water|can we find water on the moon|moon resources|ice on the moon',
  ["Yes. Water ice has been detected in permanently shadowed craters near the lunar poles, including by NASA's LCROSS impact in 2009. It could become drinking water, oxygen and rocket propellant, which is why the south pole is such a popular landing target."]],
moon_landing: ['who was the first person on the moon|apollo 11|neil armstrong|first moon landing|apollo missions|who walked on the moon|when did we land on the moon|buzz aldrin|apollo program',
  ['Apollo 11 landed on July 20, 1969: Neil Armstrong and Buzz Aldrin walked on the surface while Michael Collins orbited above. Between 1969 and 1972, Apollo put 12 astronauts on the Moon in six landings.']],
artemis: ['what is artemis|artemis program|nasa return to the moon|are we going back to the moon|artemis mission|moon base|moon colony|artemis',
  ["Artemis is NASA's program to return people to the Moon and build a sustained presence there, starting near the south pole. It uses the SLS rocket and Orion capsule, and the lessons are meant to prepare us for Mars."]],

mars_basic: ['mars|the red planet|mars facts|tell me about mars|how far is mars|how far away is mars|mars distance|how big is mars|facts about mars|what is mars|how long is a day on mars|how long is a year on mars',
  ['Mars is about 6,779 km wide, roughly half of Earth\'s diameter. Its distance from us swings between 55 million and 400 million km. A Mars day (a “sol”) lasts 24 h 39 min, and its year is 687 Earth days. It also has Olympus Mons, a volcano about 22 km tall.']],
mars_gravity: ['gravity on mars|mars gravity|how much would i weigh on mars|can i jump on mars|how heavy would i be on mars',
  ["Mars has 3.71 m/s² of gravity, about 38% of Earth's. That makes cargo easier to lift, but nobody yet knows what months of it do to human bones and muscles."]],
mars_atmo: ['mars atmosphere|can humans breathe on mars|is mars habitable|air on mars|mars air pressure|mars weather|mars temperature|how cold is mars|dust storms on mars|can i breathe on mars',
  ["Mars's air is about 95% carbon dioxide and its surface pressure is under 1% of Earth's, so humans can't breathe it and would need pressurized suits. It averages around -60 °C, and global dust storms can block sunlight for weeks."]],
mars_travel: ['how long to get to mars|travel time to mars|how do we get to mars|mars launch window|how long is the trip to mars|journey to mars|transit to mars|how long does it take to fly to mars',
  ["With today's rockets the trip takes roughly 6 to 9 months each way. Launch windows open only about every 26 months, when Earth and Mars line up, so a crewed round trip would last around 2 to 3 years including the wait on the surface."]],
mars_rovers: ['mars rovers|curiosity rover|perseverance rover|ingenuity helicopter|what rovers are on mars|jezero crater|mars exploration',
  ['Curiosity landed in Gale Crater in 2012. Perseverance landed in Jezero Crater on February 18, 2021, carrying the Ingenuity helicopter, the first aircraft to fly on another planet. Perseverance is caching rock samples for a future return to Earth.']],
mars_life: ['is there life on mars|water on mars|was there water on mars|did mars have oceans|could mars support life|martians|is there ice on mars',
  ['No life has been confirmed. Mars once had rivers and lakes (Jezero was a lake), and today it holds water ice at the poles and underground. Perseverance is hunting for signs of ancient microbial life.']],

radiation: ['radiation in space|cosmic rays|is space safe for astronauts|solar flares|solar storms|how dangerous is radiation|radiation shielding',
  ["Beyond Earth's magnetic field, astronauts face cosmic rays and bursts of solar particles. A Mars round trip is estimated at hundreds of millisieverts, many times the yearly dose on Earth. Habitats can use water walls, regolith cover and storm shelters to cut the risk."]],
life_support: ['how do astronauts breathe|oxygen in space|food and water in space|life support|habitat design|how do astronauts survive|recycling water|moxie|how do astronauts get oxygen',
  ['Life-support systems scrub carbon dioxide, make oxygen by splitting water, and recycle water; the ISS now reclaims about 98% of it. On Mars, the MOXIE experiment on Perseverance already made oxygen from the carbon dioxide in the air.']],
isru: ['use local resources|in situ resource utilization|isru|moon dust|regolith|build a base from moon dust|make fuel on mars|living off the land',
  ["In-situ resource utilization means using what's already there: oxygen from Moon dust (regolith is about 43% oxygen by mass), water ice for propellant, and Mars's carbon dioxide for oxygen and fuel. Every kilogram not launched from Earth saves a fortune."]],
comm_delay: ['communication delay|signal delay to mars|how long does a message take to mars|radio delay|latency to mars|can i call earth from mars',
  ['Signals travel at light speed: about 1.3 seconds to the Moon and roughly 3 to 22 minutes one way to Mars. Around solar conjunction, Mars missions even lose contact for about two weeks, so crews must be able to decide on their own.']],
rockets: ['how do rockets work|rocket fuel|what is delta v|how much fuel to reach orbit|why are rockets so big|launch to orbit',
  ["Rockets push mass out the back to accelerate forward (Newton's third law). Reaching low Earth orbit takes about 9.4 km/s of delta-v, so most of a rocket's mass is propellant, which is why every extra kilogram of cargo is so expensive."]],
compare: ['moon vs mars|which is easier moon or mars|why go to the moon first|moon or mars|compare moon and mars|which is better to colonize',
  ['The Moon is days away with near-instant comms, but it has no air and two-week nights. Mars is months away with minutes of delay, but has a thin atmosphere, accessible water ice and days almost as long as ours. Most plans use the Moon as a proving ground for Mars.']],

// "out of scope" examples teach the network to hand general questions to the web fallback instead of guessing.
web: ['who invented the telephone|what is the capital of france|how tall is mount everest|tell me about dogs|who is albert einstein|what is photosynthesis|how many people live in japan|explain quantum computing|who won the world cup|what is the meaning of life|how does the internet work|when was the great pyramid built|define democracy|what is a black hole|who painted the mona lisa|how many calories are in an apple|what is the speed of light|who wrote hamlet|what is inflation|why is the sky blue|where is brazil|what is machine learning|tell me about the roman empire|how do vaccines work|what is the population of india', ['__web']]
};
const HUH = ["Hmm, I didn't catch that. Try asking about the Moon or Mars, or say “tour”.", "I'm not sure I follow. Want a tour or a space fact?"];
const IDK = ["I don't have that one offline, and I couldn't reach the web just now. Ask me about the Moon or Mars, or try again in a moment."];

/* ================= 2. THE NEURAL NETWORK (no libraries) ================= */
const D = 2048, H = 24; // hashed feature slots, hidden units
const norm = s => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0) % D; };
const feats = text => { // words + word pairs + character trigrams (the trigrams make it forgiving of typos)
  const t = norm(text), f = new Set();
  t.forEach((w, i) => {
    f.add(hash('w' + w));
    if (i) f.add(hash('b' + t[i - 1] + ' ' + w));
    const p = '#' + w + '#';
    for (let k = 0; k < p.length - 2; k++) f.add(hash('c' + p.slice(k, k + 3)));
  });
  return [...f];
};
const labels = Object.keys(I), K = labels.length, X = [], Y = [], known = new Set();
labels.forEach((l, k) => I[l][0].split('|').forEach(p => { X.push(feats(p)); Y.push(k); norm(p).forEach(w => known.add(w)); }));

let seed = 7; // seeded so training is identical on every load
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const W1 = new Float32Array(D * H).map(() => (rnd() - .5) * .3), b1 = new Float32Array(H);
const W2 = new Float32Array(K * H).map(() => (rnd() - .5) * .6), b2 = new Float32Array(K);

function fwd(idx) { // input -> hidden (tanh) -> softmax over intents
  const s = 1 / Math.sqrt(idx.length || 1), h = new Float32Array(H), p = new Float32Array(K);
  for (let j = 0; j < H; j++) { let a = b1[j]; for (const i of idx) a += W1[i * H + j] * s; h[j] = Math.tanh(a); }
  let m = -1e9; for (let k = 0; k < K; k++) { let a = b2[k]; for (let j = 0; j < H; j++) a += W2[k * H + j] * h[j]; p[k] = a; if (a > m) m = a; }
  let t = 0; for (let k = 0; k < K; k++) { p[k] = Math.exp(p[k] - m); t += p[k]; }
  for (let k = 0; k < K; k++) p[k] /= t;
  return { h, p, s };
}
function train(epochs = 140, lr = .5) { // plain SGD + backprop on cross-entropy
  const order = X.map((_, i) => i);
  for (let e = 0; e < epochs; e++) {
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const rate = lr * (1 - .8 * e / epochs);
    for (const n of order) {
      const idx = X[n], { h, p, s } = fwd(idx), dh = new Float32Array(H);
      for (let k = 0; k < K; k++) {
        const g = p[k] - (k === Y[n] ? 1 : 0);
        for (let j = 0; j < H; j++) { dh[j] += g * W2[k * H + j]; W2[k * H + j] -= rate * g * h[j]; }
        b2[k] -= rate * g;
      }
      for (let j = 0; j < H; j++) {
        const d = dh[j] * (1 - h[j] * h[j]);
        b1[j] -= rate * d;
        for (const i of idx) W1[i * H + j] -= rate * d * s;
      }
    }
  }
}
function classify(text) {
  const tk = norm(text), { p } = fwd(feats(text));
  let k = 0; for (let i = 1; i < K; i++) if (p[i] > p[k]) k = i;
  return { intent: labels[k], p: p[k], tk, cov: tk.length ? tk.filter(w => known.has(w)).length / tk.length : 0 };
}

if (typeof document === 'undefined') { train(); if (typeof module !== 'undefined') module.exports = { classify, labels }; return; } // SSR-safe + test hook

/* ================= 3. THE FLOATING UI, TOUR AND FALLBACKS ================= */
const ready = new Promise(r => (window.requestIdleCallback || setTimeout)(() => { train(); r(); }));
const pick = a => a[Math.floor(Math.random() * a.length)], sleep = ms => new Promise(r => setTimeout(r, ms));
const START = [['Take the tour', () => step(0)], ['Moon facts'], ['Mars facts'], ['Tell me a joke']];
const hist = [], me = {}, tour = { i: -1 };
let host, root, log, inp, panel, fab, hl, spotEl = null, greeted = 0;

const CSS = `
:host{--bg:#17181c;--card:#23252b;--ink:#e6edf3;--dim:#9fb4c7;--moon:#a9bccc;--mars:#b9482a;--accent:var(--moon);--on:#101318}
:host([data-body=mars]){--accent:var(--mars);--on:#fff}
*{box-sizing:border-box}
.fab,.panel{position:fixed;right:max(16px,env(safe-area-inset-right));pointer-events:auto;font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.fab{bottom:max(16px,env(safe-area-inset-bottom));width:56px;height:56px;padding:0;border:0;border-radius:50%;background:none;cursor:pointer;filter:drop-shadow(0 6px 14px #0008)}
.orb{display:block;width:100%;height:100%;border-radius:50%;box-shadow:inset 0 0 0 2px #0004;background:radial-gradient(circle at 32% 30%,#fff5 0 10%,#0000 11%),radial-gradient(circle at 64% 68%,#0003 0 9%,#0000 10%),linear-gradient(100deg,var(--moon) 0 50%,var(--mars) 50%)}
button:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.panel{bottom:calc(max(16px,env(safe-area-inset-bottom)) + 68px);width:min(380px,calc(100vw - 24px));height:min(560px,calc(100vh - 120px));height:min(560px,calc(100dvh - 120px));display:flex;flex-direction:column;background:var(--bg);color:var(--ink);border:1px solid #ffffff1f;border-radius:16px;box-shadow:0 18px 50px #000a;overflow:hidden;transform-origin:bottom right;animation:in .18s ease-out}
.panel[hidden]{display:none}
@keyframes in{from{opacity:0;transform:scale(.96) translateY(8px)}}
header{display:flex;gap:10px;align-items:center;padding:12px 14px;border-bottom:2px solid var(--accent);transition:border-color .4s}
header .orb{width:30px;height:30px;flex:none}
header div{flex:1;min-width:0}header b{display:block}header small{color:var(--dim)}
.x{background:none;border:0;color:var(--dim);font-size:22px;line-height:1;padding:4px 8px;border-radius:8px;cursor:pointer}
.log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px}
.m{max-width:85%;padding:8px 12px;border-radius:12px;white-space:pre-wrap;overflow-wrap:anywhere}
.bot{align-self:flex-start;background:var(--card);border-bottom-left-radius:4px}
.me{align-self:flex-end;background:var(--moon);color:#101318;border-bottom-right-radius:4px}
.m a{display:block;margin-top:6px;color:var(--ink)}
.dots i{display:inline-block;width:6px;height:6px;margin:0 2px;border-radius:50%;background:var(--dim);animation:b 1s infinite}
.dots i:nth-child(2){animation-delay:.15s}.dots i:nth-child(3){animation-delay:.3s}
@keyframes b{50%{opacity:.25}}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{background:none;border:1px solid var(--accent);color:var(--ink);border-radius:999px;padding:4px 11px;cursor:pointer}
.chip:hover{background:#ffffff14}
.row{display:flex;gap:8px;padding:10px;border-top:1px solid #ffffff1a}
input{flex:1;min-width:0;background:var(--card);border:1px solid #ffffff1f;color:var(--ink);border-radius:10px;padding:9px 11px;font:inherit}
.send{background:var(--accent);color:var(--on);border:0;border-radius:10px;padding:0 14px;font:inherit;font-weight:600;cursor:pointer}
.hl{position:fixed;display:none;border-radius:10px;pointer-events:none;box-shadow:0 0 0 9999px #06080cb3,0 0 0 2px var(--accent);transition:all .25s}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}`;

const fmt = s => s.replace('{n}', CFG.name).replace('{u}', me.name || 'explorer');

function add(text, cls, o = {}) {
  const d = document.createElement('div'); d.className = 'm ' + cls; d.textContent = text; // textContent: user text can never inject HTML
  if (o.link) { const a = document.createElement('a'); a.href = o.link.href; a.target = '_blank'; a.rel = 'noopener'; a.textContent = o.link.label; d.append(a); }
  log.querySelectorAll('.chips').forEach(e => e.remove());
  log.append(d);
  if (o.chips) {
    const c = document.createElement('div'); c.className = 'chips';
    o.chips.forEach(([t, f]) => { const b = document.createElement('button'); b.className = 'chip'; b.textContent = t; b.onclick = () => { c.remove(); f ? f() : send(t); }; c.append(b); });
    log.append(c);
  }
  log.scrollTop = log.scrollHeight; return d;
}
async function say(text, o) { // typing dots, then the message: feels less robotic
  const d = add('', 'bot dots'); d.innerHTML = '<i></i><i></i><i></i>';
  await sleep(250 + Math.min(text.length * 6, 700));
  d.remove(); add(text, 'bot', o); hist.push({ role: 'assistant', content: text });
}
async function send(t) {
  t = (t || inp.value).trim(); if (!t) return; inp.value = '';
  add(t, 'me'); hist.push({ role: 'user', content: t });
  await ready; await respond(t);
}

/* --- tour --- */
function place() {
  const r = spotEl && spotEl.getBoundingClientRect();
  hl.style.display = r ? 'block' : 'none';
  if (r) Object.assign(hl.style, { left: r.left - 8 + 'px', top: r.top - 8 + 'px', width: r.width + 16 + 'px', height: r.height + 16 + 'px' });
}
function spot(el) { spotEl = el || null; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); place(); }
function step(i) {
  const T = CFG.tour; if (i >= T.length) return stop(true);
  i = Math.max(i, 0); tour.i = i;
  const s = T[i]; spot(s.sel && document.querySelector(s.sel));
  return say(`${s.title} (${i + 1}/${T.length})\n${s.text}`, { chips: [i ? ['Back', () => step(i - 1)] : 0, [i < T.length - 1 ? 'Next' : 'Finish', () => step(i + 1)], ['End tour', () => stop()]].filter(Boolean) });
}
function stop(done) {
  tour.i = -1; spot(null);
  return say(done ? "That's the whole tour! Ask me anything, or pick a topic." : "Tour ended. I'm here if you need me.", { chips: START });
}

/* --- off-topic questions: your LLM proxy first (if set), then Wikipedia --- */
async function web(q) {
  // Preferred route: backend uses a local Ollama model, then cached/online knowledge.
  try {
    if (CFG.llmEndpoint) {
      const r = await fetch(CFG.llmEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, history: hist.slice(-8) })
      });
      const j = await r.json();
      if (r.ok && j.reply) return say(j.reply, j.link ? { link: j.link } : undefined);
    }
  } catch (e) { /* backend unavailable: try browser-side Wikipedia below */ }
  try {
    if (CFG.wikipedia && navigator.onLine !== false) {
      const topic = q.replace(/[?!]+/g, '').replace(/^(please |can you |could you )?(tell me about|tell me|what is|what are|what was|who is|who was|who were|explain|define|describe)\s+/i, '');
      const u = 'https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=1&gsrsearch=' + encodeURIComponent(topic) + '&prop=extracts|info&exintro=1&explaintext=1&exsentences=3&inprop=url';
      const response = await fetch(u, { signal: AbortSignal.timeout(8000) });
      const j = await response.json(), pg = j.query && Object.values(j.query.pages)[0];
      if (pg && pg.extract) return say(pg.extract, { link: { href: pg.fullurl, label: 'Read more: ' + pg.title } });
    }
  } catch (e) { /* offline, timeout, or blocked: fall through */ }
  return say(pick(IDK), { chips: START });
}

async function respond(t) {
  const nm = t.match(/\b(?:my name is|call me)\s+([a-z]+)/i);
  if (nm) { me.name = nm[1][0].toUpperCase() + nm[1].slice(1).toLowerCase(); return say(`Nice to meet you, ${me.name}! What would you like to explore?`, { chips: START }); }
  const c = classify(t);
  if (c.intent === 'web' || c.p < CFG.threshold || c.cov < .34) return c.tk.length < 3 && c.intent !== 'web' ? say(pick(HUH), { chips: START }) : web(t);
  if (/^(moon|mars)_/.test(c.intent)) host.dataset.body = c.intent.slice(0, 4); // the panel tints to the world being discussed
  const a = pick(I[c.intent][1]), idle = f => tour.i < 0 ? say('No tour is running. Want one?', { chips: [['Start the tour', () => step(0)]] }) : f();
  if (a === '__nasa_apod' || a === '__nasa_asteroids') return web(t);
  if (a === '__tour') return step(0);
  if (a === '__next') return idle(() => step(tour.i + 1));
  if (a === '__back') return idle(() => step(tour.i - 1));
  if (a === '__stop') return idle(() => stop());
  return say(fmt(a), c.intent === 'greet' ? { chips: START } : undefined);
}

function mount() {
  host = document.createElement('div'); host.id = 'nova-bot';
  host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483000';
  root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${CSS}</style><div class="hl"></div>
<section class="panel" hidden aria-label="${CFG.name} mission guide"><header><i class="orb"></i><div><b>${CFG.name}</b><small>Moon &amp; Mars guide</small></div><button class="x" aria-label="Close chat">×</button></header>
<div class="log" role="log" aria-live="polite"></div>
<div class="row"><input aria-label="Message" placeholder="Ask about the Moon, Mars, or say “tour”" maxlength="300" autocomplete="off"><button class="send">Send</button></div></section>
<button class="fab" aria-label="Open ${CFG.name} mission guide" aria-expanded="false"><i class="orb"></i></button>`;
  const $ = s => root.querySelector(s);
  log = $('.log'); inp = $('input'); panel = $('.panel'); fab = $('.fab'); hl = $('.hl');
  const open = () => { panel.hidden = false; fab.setAttribute('aria-expanded', 'true'); if (!greeted++) say(fmt(pick(I.greet[1])), { chips: START }); inp.focus(); };
  const close = () => { panel.hidden = true; fab.setAttribute('aria-expanded', 'false'); fab.focus(); };
  fab.onclick = () => panel.hidden ? open() : close();
  $('.x').onclick = close; $('.send').onclick = () => send();
  inp.onkeydown = e => { if (e.key === 'Enter') send(); };
  root.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(); });
  addEventListener('scroll', place, true); addEventListener('resize', place);
  document.body.append(host);
  window.NovaBot = { open, close, ask: send, classify, startTour: () => { open(); step(0); } }; // handy for buttons and debugging
}
document.readyState === 'loading' ? addEventListener('DOMContentLoaded', mount) : mount();
})();