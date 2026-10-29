'use strict';
/*
 * dashboardAnswers.js
 * Exact answers about the player's LIVE mission dashboard (body.state sent by the game).
 *
 * - No model, no guessing: every number comes from the state object.
 * - If the question is clearly "what is MY <live value>" but the value did not arrive,
 *   Nova says so instead of falling through to a generic reply.
 * - Advice / hypothetical / science questions return null so the rules engine,
 *   knowledge base and LLM can handle them.
 * - Works for English, Banglish and Bangla script.
 *
 * State contract (verified against NovaPanel.jsx, MissionSessionContext.jsx,
 * missionEngine.js and useSurvivalZone.js):
 *   mission ('moon'|'mars'), campaignDays, day, score, eventCount,
 *   missionStatus ('active'|'failed'|'success'),
 *   resources { power, water, food, oxygen, shielding }  (0-100),
 *   objectives { total, done },
 *   currentEvent { id, title, description, severity, choices[{ label, effects, score }],
 *                  task { title, steps[{ action }], choiceIndex } },
 *   taskProgress { eventId, stepIndex },
 *   survival { oxygen, health, inZone, status }  (oxygen and health are 0-100).
 */

const RESOURCES = ['power', 'water', 'food', 'oxygen', 'shielding'];

// Source of truth is missionEngine.js (MISSION_DURATION). Only used when the client omits campaignDays.
const DEFAULT_DAYS = { moon: 20, mars: 30 };

const LABEL = {
  en: { power: 'Power', water: 'Water', food: 'Food', oxygen: 'Oxygen', shielding: 'Radiation Shielding' },
  bn: { power: 'পাওয়ার', water: 'পানি', food: 'খাবার', oxygen: 'অক্সিজেন', shielding: 'রেডিয়েশন শিল্ডিং' }
};
LABEL.bl = LABEL.en;

const ALIASES = {
  power: ['power', 'electricity', 'পাওয়ার', 'বিদ্যুৎ', 'বিদ্যুত'],
  water: ['water', 'পানি', 'ওয়াটার'],
  food: ['food', 'খাবার', 'খাদ্য', 'ফুড'],
  oxygen: ['oxygen', 'o2', 'অক্সিজেন'],
  shielding: ['shielding', 'shield', 'radiation', 'রেডিয়েশন', 'শিল্ড', 'শিল্ডিং']
};

// Same thresholds as getResourceStatus() in missionEngine.js, so Nova matches the dashboard badge.
function statusOf(v) {
  if (v <= 0) return 'CRITICAL';
  if (v < 25) return 'LOW';
  if (v < 50) return 'CAUTION';
  return 'STABLE';
}

/* ---------------- text helpers ---------------- */

function norm(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/^\[current mission:[^\]]*\]\s*/i, '')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ') // \p{M} keeps Bangla vowel signs and hasanta
    .trim()
    .replace(/\s+/g, ' ');
}

const isAscii = w => /^[\x00-\x7f]+$/.test(w);

// Latin words must match whole words; Bangla words match as substrings (suffixes like -এর, -ে).
function has(q, words) {
  const padded = ` ${q} `;
  return words.some(w => (isAscii(w) ? padded.includes(` ${w} `) : q.includes(w)));
}

const ADVICE = [
  'if', 'should', 'why', 'how do', 'how can', 'how to', 'what happens', 'what if', 'what will', 'will', 'would',
  'what do i do', 'explain', 'mean', 'means', 'meaning', 'best', 'better', 'recommend', 'safest',
  'kivabe', 'kibhabe', 'jodi', 'hole', 'korle', 'ashle', 'gele', 'jaile', 'ki hobe', 'hobe', 'lagbe', 'keno', 'mane',
  'যদি', 'হলে', 'গেলে', 'করলে', 'উচিত', 'করব', 'করবো', 'কেন', 'কীভাবে', 'কিভাবে', 'কি হবে', 'কী হবে', 'কি করব', 'কী করব', 'মানে'
];
const STRONG = [
  'my', 'our', 'current', 'currently', 'now', 'right now', 'today', 'todays', 'am i', 'i am', 'i m', 'have i', 'did i', 'i have',
  'mission day', 'mission status', 'dashboard',
  'amar', 'amader', 'ami', 'ekhon', 'আমার', 'আমাদের', 'আমি', 'এখন', 'বর্তমান', 'এখনকার'
];
const WEAK = ['level', 'levels', 'left', 'remaining', 'percent', 'status', 'done', 'completed', 'koto', 'কত', 'কতটুকু'];
const SCIENCE = [
  'atmosphere', 'earth', 'planet', 'astronaut', 'astronauts', 'human', 'humans', 'iss', 'station',
  'breathe', 'on mars', 'on the moon', 'in space', 'real'
];
const SUIT = ['suit', 'spacesuit', 'survival', 'safe zone', 'safezone', 'সুট', 'সুটের', 'সেফ জোন'];
const ZONE = ['safe zone', 'safezone', 'সেফ জোন', 'suit health', 'health', 'স্বাস্থ্য'];
const LOWEST = ['lowest', 'weakest', 'most critical', 'least', 'sobcheye kom', 'shobcheye kom', 'kom', 'সবচেয়ে কম'];
const DAY_Q = [
  'which day', 'what day', 'current day', 'mission day', 'day am i', 'day number', 'day koto', 'din koto',
  'kon din', 'kon dine', 'কোন দিন', 'কোন দিনে', 'কততম দিন', 'কত তম দিন', 'দিন কত'
];
const REMAIN_DAYS = [
  'days left', 'days are left', 'days remaining', 'days remain', 'remaining days', 'days to go',
  'din baki', 'baki din', 'দিন বাকি', 'বাকি দিন'
];
const DURATION = ['total', 'campaign', 'koy', 'কয়', 'duration', 'how many days', 'how long'];
const TASK_WORDS = ['task', 'tasks', 'step', 'steps', 'টাস্ক', 'ধাপ'];
const EVENT_WORDS = ['event', 'events', 'ইভেন্ট', 'ঘটনা'];
const CHOICE_WORDS = ['choice', 'choices', 'option', 'options', 'decision', 'decisions', 'বিকল্প', 'অপশন', 'সিদ্ধান্ত'];
const COUNT_WORDS = ['how many', 'koyta', 'koyti', 'কয়টি', 'কয়টা', 'কতগুলো'];
const ZERO_WORDS = ['reaches zero', 'reach zero', 'at zero', 'goes to zero', 'drops to zero', 'becomes zero', '0 percent', '0%', 'শূন্য', 'জিরো', '০%'];
const TREND_WORDS = ['trend', 'trending', 'history', 'historical', 'increasing', 'decreasing', 'rising', 'falling', 'going up', 'going down', 'change over time', 'changed over time', 'trend ta', 'বাড়ছে', 'কমছে', 'পরিবর্তন'];
const RISK_WORDS = ['risk', 'risky', 'at risk', 'danger', 'threat', 'ঝুঁকি', 'বিপদ'];
const CHOICE_ADVICE_WORDS = ['which choice', 'what choice', 'which option', 'what option', 'should i take', 'should i choose', 'best choice', 'best option', 'কোনটা নেব', 'কোন বিকল্প', 'কোন অপশন'];
const CERTIFICATE_WORDS = ['certificate', 'সার্টিফিকেট', 'সনদ'];
const SCORE = ['score', 'points', 'স্কোর'];
const SCORE_RULES = ['win', 'won', 'succeed', 'success', 'fail', 'negative', 'zero', 'positive', 'need', 'needed', 'minimum'];
const OBJ = ['objective', 'objectives', 'অবজেক্টিভ', 'লক্ষ্য'];
const SUMMARY = ['status', 'dashboard', 'levels', 'overview', 'রিসোর্স', 'স্ট্যাটাস', 'ড্যাশবোর্ড'];
const RESOURCE_WORD = ['resource', 'resources', 'রিসোর্স'];
const BANGLISH = ['amar', 'amader', 'ami', 'koto', 'kon', 'din', 'dine', 'ekhon', 'baki', 'sobcheye', 'shobcheye', 'achi', 'ache', 'dekhao', 'bolo', 'koyta'];

/* ---------------- state reader ---------------- */

function num(v) {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

const str = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

function readObjectives(o) {
  if (Array.isArray(o)) {
    const recognisable = x => x && typeof x === 'object' &&
      (typeof x.done === 'boolean' || typeof x.completed === 'boolean' || typeof x.status === 'string');
    if (!o.length || !o.every(recognisable)) return undefined;
    const done = o.filter(x => x.done === true || x.completed === true || x.status === 'done' || x.status === 'completed').length;
    return { total: o.length, done };
  }
  if (o && typeof o === 'object') {
    const total = num(o.total);
    const done = num(o.done ?? o.completed);
    if (total !== undefined && done !== undefined && total >= 0 && done >= 0 && done <= total) {
      return { total, done };
    }
  }
  return undefined;
}

function readEvent(e) {
  if (!e || typeof e !== 'object') return undefined;
  const title = str(e.title, 120);
  if (!title) return undefined;
  const ev = {
    id: str(e.id, 60),
    title,
    description: str(e.description, 300),
    severity: e.severity === 'critical' || e.severity === 'warning' ? e.severity : undefined,
    choices: []
  };
  if (Array.isArray(e.choices)) {
    e.choices.slice(0, 5).forEach((c, i) => {
      const choice = c && typeof c === 'object' ? c : {};
      let label = str(choice.label, 200);
      const suffix = `: ${title}`; // engine labels look like "<action>: <event title>"
      if (label.endsWith(suffix)) label = label.slice(0, -suffix.length);
      const effects = {};
      if (choice.effects && typeof choice.effects === 'object') {
        for (const k of RESOURCES) {
          const v = num(choice.effects[k]);
          if (v !== undefined && v !== 0) effects[k] = v;
        }
      }
      ev.choices.push({ label: label || `Option ${i + 1}`, effects, score: num(choice.score) });
    });
  }
  const t = e.task;
  if (t && typeof t === 'object' && Array.isArray(t.steps) && t.steps.length) {
    ev.task = {
      title: str(t.title, 120),
      steps: t.steps.slice(0, 10).map(s => str(s && s.action, 160)),
      choiceIndex: Number.isInteger(t.choiceIndex) ? t.choiceIndex : undefined
    };
  }
  return ev;
}

function readHistory(raw) {
  const source = Array.isArray(raw?.resourceHistory)
    ? raw.resourceHistory
    : Array.isArray(raw?.history)
      ? raw.history
      : Array.isArray(raw?.trendHistory)
        ? raw.trendHistory
        : null;
  if (!source) return undefined;
  const observations = source.slice(-50).map(item => {
    const input = item && typeof item === 'object' ? item : {};
    const inputResources = input.resources && typeof input.resources === 'object'
      ? input.resources
      : input;
    const resources = {};
    for (const key of RESOURCES) {
      const value = num(key === 'shielding'
        ? (inputResources.shielding ?? inputResources.radiation)
        : inputResources[key]);
      if (value !== undefined) resources[key] = value;
    }
    const day = num(input.day);
    return {
      day: day !== undefined && day >= 0 ? Math.floor(day) : undefined,
      resources
    };
  }).filter(item => Object.keys(item.resources).length > 0);
  return observations.length ? observations : undefined;
}

// Returns a sanitised copy of what the game sent. Missing fields stay undefined (never defaulted to 0).
function readDashboard(raw, missionHint) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const d = { resources: {} };

  const m = String(raw.mission || missionHint || '').toLowerCase();
  if (m.includes('moon')) d.mission = 'moon';
  else if (m.includes('mars')) d.mission = 'mars';

  const res = raw.resources && typeof raw.resources === 'object' ? raw.resources : {};
  for (const key of RESOURCES) {
    // Game key is "shielding". "radiation" is tolerated only as an input alias.
    const v = num(key === 'shielding' ? (res.shielding ?? res.radiation) : res[key]);
    if (v !== undefined) d.resources[key] = v;
  }

  const day = num(raw.day);
  if (day !== undefined && day >= 0) d.day = Math.floor(day);

  const days = num(raw.campaignDays);
  if (days !== undefined && days > 0 && days <= 365) d.campaignDays = Math.floor(days);
  else if (d.mission) d.campaignDays = DEFAULT_DAYS[d.mission];

  const score = num(raw.score);
  if (score !== undefined) d.score = score;

  const eventCount = num(raw.eventCount);
  if (eventCount !== undefined && eventCount >= 0) d.eventCount = Math.floor(eventCount);

  if (['active', 'failed', 'success'].includes(raw.missionStatus)) d.missionStatus = raw.missionStatus;

  const objectives = readObjectives(raw.objectives);
  if (objectives) d.objectives = objectives;

  d.event = readEvent(raw.currentEvent);
  const tp = raw.taskProgress && typeof raw.taskProgress === 'object' ? raw.taskProgress : null;
  const stepIndex = tp ? num(tp.stepIndex) : undefined;
  d.stepIndex = d.event && tp && tp.eventId === d.event.id && stepIndex !== undefined
    ? Math.max(0, Math.floor(stepIndex))
    : 0;

  if (raw.survival && typeof raw.survival === 'object') {
    const s = {};
    const oxygen = num(raw.survival.oxygen);
    const health = num(raw.survival.health);
    if (oxygen !== undefined) s.oxygen = oxygen;
    if (health !== undefined) s.health = health;
    if (typeof raw.survival.inZone === 'boolean') s.inZone = raw.survival.inZone;
    if (['safe', 'danger', 'critical', 'failed'].includes(raw.survival.status)) s.status = raw.survival.status;
    if (Object.keys(s).length) d.survival = s;
  }
  d.history = readHistory(raw);
  return d;
}

/* ---------------- intent detection ---------------- */

function detectIntent(q) {
  const strong = has(q, STRONG);
  const weak = has(q, WEAK);
  const science = has(q, SCIENCE);
  const personal = strong || (weak && !science);
  const keys = RESOURCES.filter(k => has(q, ALIASES[k]));
  const suit = has(q, SUIT);
  const resourceWord = has(q, RESOURCE_WORD);
  const hypothetical = has(q, ADVICE) || has(q, ['what happens', 'what if', 'if']);

  if (has(q, CERTIFICATE_WORDS)) return { type: 'certificate' };
  if (has(q, CHOICE_ADVICE_WORDS) && (has(q, EVENT_WORDS) || has(q, ['choice', 'option', 'বিকল্প', 'অপশন']))) {
    return { type: 'choiceAdvice' };
  }
  if (hypothetical && has(q, ZERO_WORDS) && keys.length && !suit) {
    return { type: 'zero', keys };
  }
  if (suit && keys.includes('oxygen') && hypothetical && has(q, ZERO_WORDS)) {
    return { type: 'suitZero' };
  }
  if (has(q, TREND_WORDS) && (keys.length || resourceWord || has(q, ['resources', 'রিসোর্স']))) {
    return { type: 'trend', keys };
  }
  if (has(q, ADVICE)) return null;

  if (has(q, ZONE) && (strong || has(q, ['am i', 'ami', 'আমি']))) return { type: 'zone' };
  if (suit && keys.includes('oxygen') && personal) return { type: 'suitOxygen' };
  if (has(q, RISK_WORDS) && (resourceWord || keys.length || has(q, ['now', 'right now', 'ekhon', 'এখন']))) return { type: 'risk' };
  if (has(q, LOWEST) && (resourceWord || keys.length || has(q, ['now', 'right now', 'ekhon', 'এখন']))) return { type: 'lowest' };
  if (has(q, REMAIN_DAYS)) return { type: 'remaining' };
  if (has(q, DURATION) && !strong) return null; // campaign length belongs to the rules engine
  if (has(q, EVENT_WORDS) && has(q, COUNT_WORDS) && personal) return { type: 'eventsDone' };
  if (has(q, DAY_Q) && personal && !/[0-9\u09E6-\u09EF]/.test(q)) return { type: 'day' };
  if (has(q, SCORE) && personal && !has(q, SCORE_RULES)) return { type: 'score' };
  if (has(q, OBJ) && personal) return { type: 'objectives' };
  if (has(q, TASK_WORDS) && personal) return { type: 'task' };
  if ((has(q, CHOICE_WORDS) || has(q, EVENT_WORDS)) && personal) return { type: 'event', withChoices: has(q, CHOICE_WORDS) };
  if (keys.length && personal && !suit) return { type: 'resource', keys };
  if ((has(q, SUMMARY) || resourceWord) && strong) return { type: 'summary' };
  return null;
}

function detectLang(rawQuestion, q) {
  if (/[\u0980-\u09FF]/.test(rawQuestion)) return 'bn';
  if (has(q, BANGLISH)) return 'bl';
  return 'en';
}

/* ---------------- replies ---------------- */

const f = n => String(Math.round(n * 10) / 10);
const MISSION_NAME = { moon: 'Moon Outpost', mars: 'Mars Outpost' };

const NAME = {
  day: { en: 'mission day', bl: 'mission day', bn: 'মিশনের দিন' },
  score: { en: 'score', bl: 'score', bn: 'স্কোর' },
  objectives: { en: 'objective progress', bl: 'objective progress', bn: 'অবজেক্টিভের অগ্রগতি' },
  survival: { en: 'safe-zone status', bl: 'safe-zone status', bn: 'সেফ জোনের অবস্থা' },
  suitOxygen: { en: 'suit oxygen', bl: 'suit oxygen', bn: 'সুটের অক্সিজেন' },
  summary: { en: 'dashboard values', bl: 'dashboard values', bn: 'ড্যাশবোর্ডের তথ্য' },
  event: { en: 'current event', bl: 'current event', bn: 'বর্তমান ইভেন্ট' },
  events: { en: 'resolved-event count', bl: 'resolved-event count', bn: 'সম্পন্ন ইভেন্টের সংখ্যা' }
};

const SEVERITY = {
  en: { critical: 'Critical', warning: 'Warning' },
  bl: { critical: 'Critical', warning: 'Warning' },
  bn: { critical: 'জরুরি', warning: 'সতর্কতা' }
};
const SCORE_WORD = { en: 'score', bl: 'score', bn: 'স্কোর' };

function effectsText(effects, score, lang) {
  const parts = RESOURCES.filter(k => k in effects)
    .map(k => `${effects[k] > 0 ? '+' : '-'}${f(Math.abs(effects[k]))}% ${LABEL[lang][k]}`);
  if (score !== undefined) parts.push(`${score > 0 ? '+' : score < 0 ? '-' : ''}${f(Math.abs(score))} ${SCORE_WORD[lang]}`);
  return parts.join(', ');
}

const S = {
  en: {
    missing: what => `I can't see your ${what} right now. That value didn't reach me from the game, so please check the dashboard.`,
    resource: (l, v, st) => `Your ${l} is at ${v}% (${st}).`,
    oxygenNote: ' This is mission oxygen from the dashboard; suit oxygen in the survival zone is tracked separately.',
    lowestNote: ' It is currently your lowest resource.',
    day: (d, t, mission) => `You are on mission day ${d}${t ? ` of ${t}` : ''}${mission ? ` (${MISSION_NAME[mission]})` : ''}.`,
    remaining: (d, t, rem) => (rem === 0
      ? `Today is the final mission day (day ${d} of ${t}).`
      : `You are on day ${d} of ${t}, so ${rem} day${rem === 1 ? '' : 's'} remain after today.`),
    score: v => `Your current score is ${v}.`,
    objectives: (done, total) => `You have completed ${done} of ${total} objectives.`,
    lowest: (l, v, st, all) => `Your lowest resource is ${l} at ${v}% (${st}). All levels: ${all}.`,
    zoneIn: 'You are inside the safe zone.',
    zoneOut: 'You are outside the safe zone.',
    zoneNums: (o, h) => [o !== undefined ? `Suit oxygen: ${f(o)}%.` : '', h !== undefined ? `Health: ${f(h)}%.` : ''].filter(Boolean).join(' '),
    zoneCritical: ' Suit oxygen is empty, so health is draining.',
    suitOxygen: (v, mission) => `Your suit oxygen is ${f(v)}%. This is the survival-zone value, separate from mission oxygen${mission !== undefined ? ` (${f(mission)}% on the dashboard)` : ''}.`,
    status: { active: 'in progress', failed: 'failed', success: 'completed successfully' },
    ended: { failed: 'has failed', success: 'was completed successfully' },
    summaryMission: (d, t, mission, score) => [mission ? MISSION_NAME[mission] : 'Mission', d !== undefined ? `day ${d}${t ? ` of ${t}` : ''}` : '', score !== undefined ? `score ${score}` : ''].filter(Boolean).join(', ') + '.',
    summaryRes: all => `Resources: ${all}.`,
    summaryObj: (done, total) => `Objectives: ${done}/${total}.`,
    summaryStatus: st => `Mission status: ${st}.`,
    eventHead: (day, title, sev, desc) => `Current event${day !== undefined ? ` (day ${day})` : ''}: "${title}"${sev ? ` [${sev}]` : ''}. ${desc}`.trim(),
    choicesHead: 'Your choices:',
    choicesNote: "Effects shown are each choice's own; the daily survival cost is applied separately.",
    noEvent: st => `There is no active event right now; the mission ${st}.`,
    noTask: 'This event has no 3D field task. Ask me for your choices to see the options.',
    task: (title, i, n, action) => `Field task${title ? ` "${title}"` : ''}: step ${i} of ${n}: ${action || '(no description)'}.`,
    taskApplies: (label, eff) => ` Completing it applies: ${label}${eff ? ` (${eff})` : ''}.`,
    eventsDone: (done, total) => `You have resolved ${done}${total ? ` of ${total}` : ''} events.`
    ,
    zero: labels => `If ${labels} reaches 0%, the current mission rules say a critical resource reaching zero can fail the mission immediately. Nova cannot infer any more specific timing or consequence from the dashboard state.`,
    trendMissing: labels => `I can't determine a trend for ${labels} yet. I need at least two historical dashboard observations; I won't infer a trend from one snapshot.`,
    trend: (label, first, last, delta, firstDay, lastDay) => `${label} changed from ${f(first)}% to ${f(last)}%${firstDay !== undefined && lastDay !== undefined ? ` (day ${firstDay} to day ${lastDay})` : ''}: ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'unchanged'} by ${f(Math.abs(delta))} percentage points. This describes the supplied history; it does not predict depletion.`,
    risk: (lowest, all) => `The lowest current value is ${lowest}; that is a snapshot, not a proven risk ranking. Actual risk also depends on the current event, choice effects and any supplied history. All live levels: ${all}.`,
    suitZero: 'The survival rules state that leaving the safe zone has a 2-second grace period. After that, suit oxygen drains at 4 percentage points per second while outside. When suit oxygen reaches 0%, health drains at 6 points per second, and the survival run fails when health reaches 0. Returning inside the zone refills suit oxygen at 8 points per second and can regenerate health while oxygen is above 50%. This is separate from mission oxygen.',
    certificate: status => status === 'success'
      ? 'The game UI specifies that a certificate is available only after a successful mission. Your current mission status is successful, so the certificate flow should be available.'
      : status === 'failed'
        ? 'The game UI specifies that a certificate is available only after a successful mission. Your current mission status is failed, so the available rules do not specify certificate eligibility for this run.'
        : 'The available game UI specifies that a certificate is available only after a successful mission. I cannot determine certificate eligibility until the current mission status is available.'
  },
  bl: {
    missing: what => `Ami ekhon apnar ${what} dekhte pachchhi na. Game theke ei data amar kache pouchayni, tai dashboard ta ekbar dekhun.`,
    resource: (l, v, st) => `Apnar ${l} ekhon ${v}% (${st}).`,
    oxygenNote: ' Eta dashboard-er mission oxygen; survival zone-er suit oxygen alada.',
    lowestNote: ' Eta ekhon apnar shobcheye kom resource.',
    day: (d, t, mission) => `Apni ekhon mission-er ${d} number dine achen${t ? ` (mot ${t} din-er moddhe)` : ''}${mission ? ` (${MISSION_NAME[mission]})` : ''}.`,
    remaining: (d, t, rem) => (rem === 0
      ? `Aajkei shesh mission day (${d}/${t}).`
      : `Apni ${t} din-er moddhe ${d} number dine achen, aajker por aro ${rem} din baki.`),
    score: v => `Apnar current score ${v}.`,
    objectives: (done, total) => `Apni ${total}-ti objective-er moddhe ${done}-ti complete korechhen.`,
    lowest: (l, v, st, all) => `Apnar shobcheye kom resource ${l} (${v}%, ${st}). Shob level: ${all}.`,
    zoneIn: 'Apni ekhon safe zone-er bhitore achen.',
    zoneOut: 'Apni ekhon safe zone-er baire achen.',
    zoneNums: (o, h) => [o !== undefined ? `Suit oxygen: ${f(o)}%.` : '', h !== undefined ? `Health: ${f(h)}%.` : ''].filter(Boolean).join(' '),
    zoneCritical: ' Suit oxygen shesh, tai health komchhe.',
    suitOxygen: (v, mission) => `Apnar suit oxygen ${f(v)}%. Eta survival-zone-er value, mission oxygen theke alada${mission !== undefined ? ` (dashboard-e ${f(mission)}%)` : ''}.`,
    status: { active: 'cholchhe', failed: 'fail hoyechhe', success: 'shofolbhabe complete' },
    ended: { failed: 'fail hoyechhe', success: 'shofolbhabe complete hoyechhe' },
    summaryMission: (d, t, mission, score) => [mission ? MISSION_NAME[mission] : 'Mission', d !== undefined ? `day ${d}${t ? `/${t}` : ''}` : '', score !== undefined ? `score ${score}` : ''].filter(Boolean).join(', ') + '.',
    summaryRes: all => `Resources: ${all}.`,
    summaryObj: (done, total) => `Objectives: ${done}/${total}.`,
    summaryStatus: st => `Mission status: ${st}.`,
    eventHead: (day, title, sev, desc) => `Ekhon-er event${day !== undefined ? ` (day ${day})` : ''}: "${title}"${sev ? ` [${sev}]` : ''}. ${desc}`.trim(),
    choicesHead: 'Apnar choices:',
    choicesNote: 'Ei effect gulo prottek choice-er nijer; daily survival cost alada bhabe apply hoy.',
    noEvent: st => `Ekhon kono active event nei; mission ${st}.`,
    noTask: 'Ei event-e kono 3D field task nei. Option dekhte amake "choices" jiggesh korun.',
    task: (title, i, n, action) => `Field task${title ? ` "${title}"` : ''}: ${n} step-er moddhe ${i} number step: ${action || '(description nei)'}.`,
    taskApplies: (label, eff) => ` Eta complete korle apply hoy: ${label}${eff ? ` (${eff})` : ''}.`,
    eventsDone: (done, total) => (total ? `Apni ${total}-ti event-er moddhe ${done}-ti resolve korechhen.` : `Apni ${done}-ti event resolve korechhen.`),
    zero: labels => `${labels} 0%-e gele current mission rules onujayi critical resource zero hole mission immediately fail korte pare. Dashboard state theke er cheye specific timing ba consequence bola jabe na.`,
    trendMissing: labels => `Ami ekhono ${labels}-er trend ber korte parchi na. Kompokkhye duita historical dashboard observation dorkar; ekta snapshot theke trend dhorbo na.`,
    trend: (label, first, last, delta, firstDay, lastDay) => `${label} ${f(first)}% theke ${f(last)}%-e gechhe${firstDay !== undefined && lastDay !== undefined ? ` (day ${firstDay} theke day ${lastDay})` : ''}: ${delta > 0 ? 'berechhe' : delta < 0 ? 'komechhe' : 'oporibortito'}, ${f(Math.abs(delta))} percentage point. Eta sudhu deya history-r bornona; depletion predict kore na.`,
    risk: (lowest, all) => `Shobcheye kom current value holo ${lowest}; eta sudhu snapshot, nishchit risk ranking noy. Actual risk current event, choice effects ebong deya history-r upor-o nirvor kore. Shob live level: ${all}.`,
    suitZero: 'Survival rules onujayi safe zone-er baire 2-second grace period ache. Tarpor baire thakle suit oxygen proti second-e 4 point kore kome. Suit oxygen 0%-e gele health proti second-e 6 point kore kome, health 0 hole survival run fail hoy. Zone-er bhitore phire ele suit oxygen proti second-e 8 point kore refill hoy ebong oxygen 50%-er beshi thakle health regenerate korte pare. Eta mission oxygen theke alada.',
    certificate: status => status === 'success'
      ? 'Game UI-te bola ache certificate sudhu successful mission-er pore available. Apnar current mission successful, tai certificate flow available howar kotha.'
      : status === 'failed'
        ? 'Game UI-te bola ache certificate sudhu successful mission-er pore available. Apnar current mission failed, tai ei run-er certificate eligibility available rules-e nei.'
        : 'Available game UI-te certificate sudhu successful mission-er pore available bola ache. Current mission status na pele eligibility nirdharon kora jabe na.'
  },
  bn: {
    missing: what => `আমি এখন আপনার ${what} দেখতে পাচ্ছি না। গেম থেকে এই তথ্য আমার কাছে পৌঁছায়নি, তাই অনুগ্রহ করে ড্যাশবোর্ড দেখুন।`,
    resource: (l, v, st) => `আপনার ${l} এখন ${v}% (${st})।`,
    oxygenNote: ' এটি ড্যাশবোর্ডের মিশন অক্সিজেন; সারভাইভাল জোনের সুট অক্সিজেন আলাদা।',
    lowestNote: ' এটি এখন আপনার সবচেয়ে কম রিসোর্স।',
    day: (d, t, mission) => `আপনি এখন মিশনের ${d} নম্বর দিনে আছেন${t ? ` (মোট ${t} দিনের মধ্যে)` : ''}${mission ? ` (${MISSION_NAME[mission]})` : ''}।`,
    remaining: (d, t, rem) => (rem === 0
      ? `আজই মিশনের শেষ দিন (${d}/${t})।`
      : `আপনি ${t} দিনের মধ্যে ${d} নম্বর দিনে আছেন, আজকের পর আরও ${rem} দিন বাকি।`),
    score: v => `আপনার বর্তমান স্কোর ${v}।`,
    objectives: (done, total) => `আপনি ${total}টির মধ্যে ${done}টি অবজেক্টিভ সম্পন্ন করেছেন।`,
    lowest: (l, v, st, all) => `আপনার সবচেয়ে কম রিসোর্স ${l} (${v}%, ${st})। সব লেভেল: ${all}।`,
    zoneIn: 'আপনি এখন সেফ জোনের ভেতরে আছেন।',
    zoneOut: 'আপনি এখন সেফ জোনের বাইরে আছেন।',
    zoneNums: (o, h) => [o !== undefined ? `সুট অক্সিজেন: ${f(o)}%।` : '', h !== undefined ? `স্বাস্থ্য: ${f(h)}%।` : ''].filter(Boolean).join(' '),
    zoneCritical: ' সুটের অক্সিজেন শেষ, তাই স্বাস্থ্য কমছে।',
    suitOxygen: (v, mission) => `আপনার সুট অক্সিজেন ${f(v)}%। এটি সারভাইভাল জোনের মান, মিশন অক্সিজেন থেকে আলাদা${mission !== undefined ? ` (ড্যাশবোর্ডে ${f(mission)}%)` : ''}।`,
    status: { active: 'চলছে', failed: 'ব্যর্থ হয়েছে', success: 'সফলভাবে সম্পন্ন' },
    ended: { failed: 'ব্যর্থ হয়েছে', success: 'সফলভাবে সম্পন্ন হয়েছে' },
    summaryMission: (d, t, mission, score) => [mission ? MISSION_NAME[mission] : 'মিশন', d !== undefined ? `দিন ${d}${t ? `/${t}` : ''}` : '', score !== undefined ? `স্কোর ${score}` : ''].filter(Boolean).join(', ') + '।',
    summaryRes: all => `রিসোর্স: ${all}।`,
    summaryObj: (done, total) => `অবজেক্টিভ: ${done}/${total}।`,
    summaryStatus: st => `মিশনের অবস্থা: ${st}।`,
    eventHead: (day, title, sev, desc) => `বর্তমান ইভেন্ট${day !== undefined ? ` (দিন ${day})` : ''}: "${title}"${sev ? ` [${sev}]` : ''}। ${desc}`.trim(),
    choicesHead: 'আপনার বিকল্পগুলো:',
    choicesNote: 'এখানে প্রতিটি বিকল্পের নিজস্ব প্রভাব দেখানো হয়েছে; দৈনিক সারভাইভাল খরচ আলাদাভাবে প্রযোজ্য।',
    noEvent: st => `এখন কোনো সক্রিয় ইভেন্ট নেই; মিশন ${st}।`,
    noTask: 'এই ইভেন্টে কোনো ৩ডি ফিল্ড টাস্ক নেই। বিকল্প দেখতে আমাকে "choices" জিজ্ঞেস করুন।',
    task: (title, i, n, action) => `ফিল্ড টাস্ক${title ? ` "${title}"` : ''}: ${n}টি ধাপের মধ্যে ${i} নম্বর ধাপ: ${action || '(বিবরণ নেই)'}।`,
    taskApplies: (label, eff) => ` এটি সম্পন্ন করলে প্রযোজ্য হবে: ${label}${eff ? ` (${eff})` : ''}।`,
    eventsDone: (done, total) => (total ? `আপনি ${total}টির মধ্যে ${done}টি ইভেন্ট সম্পন্ন করেছেন।` : `আপনি ${done}টি ইভেন্ট সম্পন্ন করেছেন।`),
    zero: labels => `${labels} ০%-এ গেলে বর্তমান মিশন নিয়ম অনুযায়ী কোনো critical resource শূন্য হলে মিশন সঙ্গে সঙ্গে ব্যর্থ হতে পারে। ড্যাশবোর্ডের তথ্য থেকে এর চেয়ে নির্দিষ্ট সময় বা ফল অনুমান করা যাবে না।`,
    trendMissing: labels => `আমি এখনো ${labels}-এর trend নির্ণয় করতে পারছি না। অন্তত দুটি historical dashboard observation দরকার; একটি snapshot থেকে trend অনুমান করব না।`,
    trend: (label, first, last, delta, firstDay, lastDay) => `${label} ${f(first)}% থেকে ${f(last)}%-এ পরিবর্তিত হয়েছে${firstDay !== undefined && lastDay !== undefined ? ` (দিন ${firstDay} থেকে দিন ${lastDay})` : ''}: ${delta > 0 ? 'বেড়েছে' : delta < 0 ? 'কমেছে' : 'অপরিবর্তিত'}, ${f(Math.abs(delta))} percentage point। এটি শুধু দেওয়া history-এর বর্ণনা; depletion-এর পূর্বাভাস নয়।`,
    risk: (lowest, all) => `সবচেয়ে কম বর্তমান মান হলো ${lowest}; এটি শুধু একটি snapshot, নিশ্চিত risk ranking নয়। প্রকৃত ঝুঁকি current event, choice effects এবং দেওয়া history-এর ওপরও নির্ভর করে। সব live level: ${all}।`,
    suitZero: 'Survival rules অনুযায়ী safe zone-এর বাইরে ২ সেকেন্ডের grace period আছে। এরপর বাইরে থাকলে suit oxygen প্রতি সেকেন্ডে ৪ point করে কমে। Suit oxygen ০%-এ গেলে health প্রতি সেকেন্ডে ৬ point করে কমে এবং health ০ হলে survival run ব্যর্থ হয়। Zone-এর ভেতরে ফিরলে suit oxygen প্রতি সেকেন্ডে ৮ point করে refill হয় এবং oxygen ৫০%-এর বেশি থাকলে health regenerate হতে পারে। এটি mission oxygen থেকে আলাদা।',
    certificate: status => status === 'success'
      ? 'Game UI-তে বলা আছে certificate শুধু successful mission-এর পরে available। আপনার বর্তমান mission successful, তাই certificate flow available হওয়ার কথা।'
      : status === 'failed'
        ? 'Game UI-তে বলা আছে certificate শুধু successful mission-এর পরে available। আপনার বর্তমান mission failed, তাই এই run-এর certificate eligibility available rules-এ নির্দিষ্ট নয়।'
        : 'Available game UI-তে certificate শুধু successful mission-এর পরে available বলা আছে। Current mission status না পেলে eligibility নির্ধারণ করা যাবে না।'
  }
};

function levelsText(d, lang) {
  return RESOURCES.filter(k => k in d.resources)
    .map(k => `${LABEL[lang][k]} ${f(d.resources[k])}% (${statusOf(d.resources[k])})`)
    .join(', ');
}

function lowestOf(d) {
  const entries = RESOURCES.filter(k => k in d.resources).map(k => [k, d.resources[k]]);
  if (!entries.length) return null;
  const min = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
  const unique = entries.filter(e => e[1] === min[1]).length === 1;
  return { key: min[0], value: min[1], unique, count: entries.length };
}

function trendFor(d, keys) {
  const history = Array.isArray(d.history) ? d.history : [];
  const selected = keys.length ? keys : RESOURCES;
  for (const key of selected) {
    const observations = history
      .filter(item => item.resources && key in item.resources)
      .map(item => ({ value: item.resources[key], day: item.day }));
    if (observations.length >= 2) {
      const first = observations[0];
      const last = observations[observations.length - 1];
      return { key, first, last, delta: last.value - first.value };
    }
  }
  return null;
}

function choiceAdvice(d, lang, s) {
  if (!d.event || !d.event.choices.length) {
    return { reply: s.missing(NAME.event[lang]), source: 'dashboard-missing' };
  }
  const choices = d.event.choices;
  const low = lowestOf(d);
  const lines = choices.map((choice, index) => {
    const effects = effectsText(choice.effects, choice.score, lang);
    return `${index + 1}) ${choice.label}${effects ? ` (${effects})` : ''}`;
  });
  const improvesLowest = low
    ? choices
      .map((choice, index) => ({ choice, index, effect: choice.effects[low.key] || 0 }))
      .filter(item => item.effect > 0)
    : [];
  const worsensLowest = low
    ? choices
      .map((choice, index) => ({ choice, index, effect: choice.effects[low.key] || 0 }))
      .filter(item => item.effect < 0)
    : [];
  const eventText = lang === 'bn'
    ? `বর্তমান ইভেন্ট "${d.event.title}"-এর বিকল্পগুলোর trade-off:`
    : lang === 'bl'
      ? `Current event "${d.event.title}"-er choices-er trade-off:`
      : `Trade-offs for the current event "${d.event.title}":`;
  const caveat = lang === 'bn'
    ? 'কোনো choice নিশ্চিতভাবে mission success guarantee করে না; final decision আপনার বর্তমান priority-এর ওপর নির্ভর করে।'
    : lang === 'bl'
      ? 'Kono choice mission success guarantee kore na; final decision apnar current priority-r upor nirvor kore.'
      : 'No choice guarantees mission success; the final decision depends on your current priorities.';
  let guidance;
  if (low && improvesLowest.length === 1 && worsensLowest.length > 0) {
    const item = improvesLowest[0];
    guidance = lang === 'bn'
      ? `বর্তমান lowest resource ${LABEL[lang][low.key]} (${f(low.value)}%)। Choice ${item.index + 1} এটি ${f(item.effect)} point বাড়ায়, তাই এটি lowest-resource protection-এর দিক থেকে সবচেয়ে সরাসরি option; তবে অন্য effects-ও বিবেচনা করুন।`
      : lang === 'bl'
        ? `Current lowest resource ${LABEL[lang][low.key]} (${f(low.value)}%)। Choice ${item.index + 1} eta ${f(item.effect)} point baray, tai lowest-resource protection-er dik theke eta shobcheye direct option; onno effects-o dekhen.`
        : `The current lowest resource is ${LABEL[lang][low.key]} (${f(low.value)}%). Choice ${item.index + 1} improves it by ${f(item.effect)} points, so it is the most direct option for protecting that resource; weigh its other effects too.`;
  } else {
    guidance = lang === 'bn'
      ? 'বর্তমান values এবং choice effects থেকে একটি একক “best” choice নিশ্চিতভাবে বলা যাচ্ছে না; কোন resource বা score priority তা আগে নির্ধারণ করুন।'
      : lang === 'bl'
        ? 'Current values ebong choice effects theke ekta single “best” choice nishchit kore bola jacche na; kon resource ba score priority ta age thik korun.'
        : 'The current values and choice effects do not establish one universally best choice; decide which resource or score trade-off is your priority.';
  }
  return {
    reply: [eventText, ...lines, guidance, caveat].join('\n'),
    source: 'dashboard-live'
  };
}

function answerFromDashboard(rawQuestion, rawState, missionHint) {
  const q = norm(rawQuestion);
  if (!q || q.length > 300) return null;
  const intent = detectIntent(q);
  if (!intent) return null;

  const lang = detectLang(String(rawQuestion || ''), q);
  const s = S[lang];
  const d = readDashboard(rawState, missionHint) || { resources: {} };
  const live = reply => ({ reply, source: 'dashboard-live' });
  const missing = what => ({ reply: s.missing(what), source: 'dashboard-missing' });
  const ended = d.missionStatus === 'failed' || d.missionStatus === 'success';

  switch (intent.type) {
    case 'certificate':
      return live(s.certificate(d.missionStatus));
    case 'suitZero':
      return live(s.suitZero);
    case 'zero': {
      const labels = intent.keys.map(k => LABEL[lang][k]).join(lang === 'bn' ? ', ' : ', ');
      return live(s.zero(labels));
    }
    case 'trend': {
      const trend = trendFor(d, intent.keys);
      if (!trend) {
        const labels = intent.keys.length
          ? intent.keys.map(k => LABEL[lang][k]).join(', ')
          : lang === 'bn' ? 'রিসোর্সগুলোর' : lang === 'bl' ? 'resources' : 'your resources';
        return { reply: s.trendMissing(labels), source: 'dashboard-missing' };
      }
      return live(s.trend(
        LABEL[lang][trend.key],
        trend.first.value,
        trend.last.value,
        trend.delta,
        trend.first.day,
        trend.last.day
      ));
    }
    case 'resource': {
      const known = intent.keys.filter(k => k in d.resources);
      if (!known.length) return missing(LABEL[lang][intent.keys[0]]);
      const low = lowestOf(d);
      let text = known.map(k => {
        const v = d.resources[k];
        let line = s.resource(LABEL[lang][k], f(v), statusOf(v));
        if (known.length === 1 && low && low.unique && low.count >= 3 && low.key === k) line += s.lowestNote;
        return line;
      }).join(' ');
      if (known.includes('oxygen')) text += s.oxygenNote;
      const absent = intent.keys.filter(k => !(k in d.resources));
      if (absent.length) text += ' ' + s.missing(absent.map(k => LABEL[lang][k]).join(', '));
      return live(text);
    }
    case 'day':
      if (d.day === undefined) return missing(NAME.day[lang]);
      return live(s.day(d.day, d.campaignDays, d.mission));
    case 'remaining':
      if (d.day === undefined || !d.campaignDays) return missing(NAME.day[lang]);
      return live(s.remaining(d.day, d.campaignDays, Math.max(d.campaignDays - d.day, 0)));
    case 'score':
      if (d.score === undefined) return missing(NAME.score[lang]);
      return live(s.score(d.score));
    case 'objectives':
      if (!d.objectives) return missing(NAME.objectives[lang]);
      return live(s.objectives(d.objectives.done, d.objectives.total));
    case 'eventsDone':
      if (d.eventCount === undefined) return missing(NAME.events[lang]);
      return live(s.eventsDone(d.eventCount, d.campaignDays));
    case 'lowest': {
      const low = lowestOf(d);
      if (!low) return missing(NAME.summary[lang]);
      return live(s.lowest(LABEL[lang][low.key], f(low.value), statusOf(low.value), levelsText(d, lang)));
    }
    case 'risk': {
      const low = lowestOf(d);
      if (!low) return missing(NAME.summary[lang]);
      const lowest = `${LABEL[lang][low.key]} ${f(low.value)}% (${statusOf(low.value)})`;
      return live(s.risk(lowest, levelsText(d, lang)));
    }
    case 'choiceAdvice':
      return choiceAdvice(d, lang, s);
    case 'zone': {
      const sv = d.survival;
      if (!sv) return missing(NAME.survival[lang]);
      const head = sv.inZone === true ? s.zoneIn : sv.inZone === false ? s.zoneOut : '';
      let text = [head, s.zoneNums(sv.oxygen, sv.health)].filter(Boolean).join(' ');
      if (sv.status === 'critical') text += s.zoneCritical;
      return live(text);
    }
    case 'suitOxygen':
      if (!d.survival || d.survival.oxygen === undefined) return missing(NAME.suitOxygen[lang]);
      return live(s.suitOxygen(d.survival.oxygen, d.resources.oxygen));
    case 'event': {
      if (!d.event) {
        if (ended) return live(s.noEvent(s.ended[d.missionStatus]));
        return missing(NAME.event[lang]);
      }
      const ev = d.event;
      const lines = [s.eventHead(d.day, ev.title, ev.severity && SEVERITY[lang][ev.severity], ev.description)];
      if (intent.withChoices && ev.choices.length) {
        lines.push(s.choicesHead);
        ev.choices.forEach((c, i) => {
          const eff = effectsText(c.effects, c.score, lang);
          lines.push(`${i + 1}) ${c.label}${eff ? ` (${eff})` : ''}`);
        });
        lines.push(s.choicesNote);
      }
      return live(lines.join('\n'));
    }
    case 'task': {
      if (!d.event) {
        if (ended) return live(s.noEvent(s.ended[d.missionStatus]));
        return missing(NAME.event[lang]);
      }
      const t = d.event.task;
      if (!t) return live(s.noTask);
      const idx = Math.min(d.stepIndex, t.steps.length - 1);
      let text = s.task(t.title, idx + 1, t.steps.length, t.steps[idx]);
      const applied = t.choiceIndex !== undefined ? d.event.choices[t.choiceIndex] : undefined;
      if (applied) text += s.taskApplies(applied.label, effectsText(applied.effects, applied.score, lang));
      return live(text);
    }
    case 'summary': {
      const parts = [];
      if (d.mission || d.day !== undefined || d.score !== undefined) {
        parts.push(s.summaryMission(d.day, d.campaignDays, d.mission, d.score));
      }
      const levels = levelsText(d, lang);
      if (levels) parts.push(s.summaryRes(levels));
      if (d.objectives) parts.push(s.summaryObj(d.objectives.done, d.objectives.total));
      if (d.missionStatus) parts.push(s.summaryStatus(s.status[d.missionStatus]));
      if (!parts.length) return missing(NAME.summary[lang]);
      return live(parts.join(' '));
    }
    default:
      return null;
  }
}

module.exports = { answerFromDashboard, readDashboard, detectIntent, norm, statusOf };