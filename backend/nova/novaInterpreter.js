// =============================================================================
// Nova Mission Question Interpreter (CommonJS, works with require() in server.js)
//
// What it does, in order:
//   1. normalize()         Bangla / Banglish / English text -> one canonical form
//   2. interpretQuestion() finds day, resource %, objective count, duration, intent
//   3. answerFromRules()   answers from mission facts, no AI model needed
//   4. buildHint()         mission-aware hint + "why" for the player
//   5. buildNovaPrompt()   safe prompt for the local model when rules cannot answer
//
// Use handleNovaQuestion(question, missionContext) as the single entry point.
// =============================================================================

// -----------------------------------------------------------------------------
// 0. Mission context the frontend should send (all fields optional)
//
// {
//   mission: "moon" | "mars",
//   campaignDays: 30,
//   day: 3,
//   resources: { power: 42, water: 70, food: 55, oxygen: 80, shielding: 60 }, // 0-100
//   objectives: { total: 5, done: 2 },
//   score: 120,
//   tasks: [{
//     id: "solar-repair", day: 3, title: "Repair the solar panel",
//     required: true,            // part of the mission objectives?
//     status: "pending",         // "pending" | "done"
//     affects: "power",          // resource this task protects
//     penalty: 10,               // % that resource drops if skipped (only if your engine knows it)
//     bonusScore: 0,             // bonus points for optional tasks
//     why: { en: "...", bn: "...", bl: "..." }   // optional science reason
//   }]
// }
// -----------------------------------------------------------------------------

const DEFAULT_CAMPAIGN_DAYS = { moon: 20, mars: 30 };

// -----------------------------------------------------------------------------
// 1. Normalisation
// -----------------------------------------------------------------------------

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const bnToAscii = (s) => s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
const asciiToBn = (s) => s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);

const CARDINALS = {};
const ORDINALS = {};

function addNumbers(target, words, start = 1) {
  words.forEach((w, i) => {
    w.split("|").forEach((alias) => {
      target[alias] = start + i;
    });
  });
}

// English
addNumbers(CARDINALS, [
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen", "twenty",
]);
CARDINALS.thirty = 30;
addNumbers(ORDINALS, [
  "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth",
  "ninth", "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth",
  "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth", "twentieth",
]);
ORDINALS.thirtieth = 30;

// Banglish
addNumbers(CARDINALS, [
  "ek", "dui|dwi", "tin", "char", "pach|panch|pachh", "choy|chhoy|cho",
  "sat|shat", "aat", "nou", "dosh|dos", "egaro", "baro", "tero",
  "chouddo|choddo", "ponero|ponor", "shorol|sholo", "shotero|sotero",
  "atharo", "unish", "bish",
]);
CARDINALS.tirish = 30;
CARDINALS.tirisho = 30;
addNumbers(ORDINALS, [
  "prothom", "ditiyo|dwitiyo", "tritiyo|tritio", "chaturtho|chotur tho",
  "ponchom|pancham", "shoshtho|sosto", "shoptom|saptam", "ostom|ashtam",
  "nobom|nabam", "doshom|dasham",
]);

// Bangla script
addNumbers(CARDINALS, [
  "এক", "দুই|দুটি|দু", "তিন", "চার", "পাঁচ|পাচ", "ছয়|ছয়", "সাত", "আট", "নয়",
  "দশ", "এগারো", "বারো", "তেরো", "চৌদ্দ", "পনেরো", "ষোল", "সতেরো", "আঠারো",
  "উনিশ", "বিশ",
]);
CARDINALS["ত্রিশ"] = 30;
addNumbers(ORDINALS, [
  "প্রথম", "দ্বিতীয়", "তৃতীয়", "চতুর্থ", "পঞ্চম", "ষষ্ঠ", "সপ্তম", "অষ্টম",
  "নবম", "দশম",
]);

// Words that mean the same thing in every language we support.
const CANON = {};
function addCanon(canon, words) {
  words.forEach((w) => {
    CANON[w] = canon;
  });
}
addCanon("day", ["day", "din", "dine", "diner", "dinta", "dinti", "দিন", "দিনে", "দিনের", "দিনটা", "দিনটি"]);
addCanon("days", ["days"]);
addCanon("campaign", ["campaign", "অভিযান", "অভিযানে"]);
addCanon("mission", ["mission", "মিশন", "মিশনে"]);
addCanon("total", ["total", "মোট"]);
addCanon("number", ["number", "nombor", "nambar", "nomber", "নম্বর", "নাম্বার", "নং"]);
addCanon("percent", ["percent", "persent", "pct", "shotangsho", "শতাংশ", "পারসেন্ট"]);
addCanon("objective", ["objective", "objectives", "goal", "goals", "lokkho", "lokko", "লক্ষ্য"]);
addCanon("score", ["score", "scores", "points", "স্কোর", "পয়েন্ট"]);
addCanon("task", ["task", "tasks", "kaj", "kajer", "কাজ", "কাজের", "কাজটা"]);
addCanon("left", ["baki", "baaki", "bakito", "বাকি", "left", "remaining", "remain"]);
addCanon("skip", ["skip", "skipped", "skipping", "miss", "missed", "ignore"]);
addCanon("ki", ["ki", "kii", "কি", "কী"]);
addCanon("hobe", ["hobe", "hbe", "hobey", "হবে"]);
addCanon("why", ["why", "keno", "kano", "কেন"]);
addCanon("na", ["na", "nah", "না"]);
addCanon("korle", ["korle", "করলে"]);
addCanon("hole", ["hole", "হলে"]);
addCanon("korbo", ["korbo", "korbo?", "করব", "করবো"]);
addCanon("how", ["kivabe", "kibhabe", "kibabe", "কিভাবে", "কীভাবে"]);
addCanon("which", ["kon", "কোন"]);
addCanon("howmany", ["koto", "কত"]);
addCanon("survive", ["টিকে", "টিকতে", "বাঁচতে", "বাঁচা"]);
addCanon("hint", ["hint", "hints", "হিন্ট", "সাহায্য"]);

// Resources: Bangla words get prefix matching so "অক্সিজেনের" still works.
const RESOURCE_WORDS = {
  power: ["power", "electricity", "electric", "bidyut", "bidyat", "পাওয়ার"],
  water: ["water", "pani", "jol", "ওয়াটার"],
  food: ["food", "khabar", "khaddo", "ফুড"],
  oxygen: ["oxygen", "oxigen", "o2", "ashijen"],
  shielding: ["shielding", "radiation", "shield", "রেডিয়েশন", "শিল্ড"],
};
const RESOURCE_BN_PREFIXES = {
  power: ["বিদ্যুৎ", "বিদ্যুত"],
  water: ["পানি", "জল"],
  food: ["খাবার", "খাদ্য"],
  oxygen: ["অক্সিজেন"],
  shielding: ["বিকিরণ"],
};
const RESOURCE_KEYS = Object.keys(RESOURCE_WORDS);
for (const [key, words] of Object.entries(RESOURCE_WORDS)) addCanon(key, words);

const CLASSIFIERS = new Set(["ta", "ti", "টা", "টি", "khana", "খানা"]);
const BN_SUFFIXES = ["টা", "টি", "টে", "ের", "ে"];
const BN_RE = /[\u0980-\u09FF]/;

function lookupNumber(token) {
  if (token in ORDINALS) return { n: ORDINALS[token], ord: true };
  if (token in CARDINALS) return { n: CARDINALS[token], ord: false };
  if (BN_RE.test(token)) {
    for (const suf of BN_SUFFIXES) {
      if (token.endsWith(suf)) {
        const base = token.slice(0, -suf.length);
        if (base in CARDINALS) return { n: CARDINALS[base], ord: false };
        if (base in ORDINALS) return { n: ORDINALS[base], ord: true };
      }
    }
  }
  return null;
}

function lookupBnResource(token) {
  for (const [key, prefixes] of Object.entries(RESOURCE_BN_PREFIXES)) {
    if (prefixes.some((p) => token.startsWith(p))) return key;
  }
  return null;
}

/**
 * Turns any supported phrasing into canonical tokens.
 *   "tin number diner kaj na korle?" -> "#3 number day task na korle"
 *   "তৃতীয় দিন"                      -> "#3o day"
 * Numbers become #n (cardinal) or #no (ordinal).
 */
function normalize(text) {
  let s = bnToAscii(String(text ?? ""))
    .replace(/\[Current mission:[^\]]*\]/gi, " ")
    .toLowerCase();

  // Bangla ordinal suffixes written after digits: 3য়, 4র্থ, 1ম, 6ষ্ঠ
  s = s.replace(/(\d+)\s*(য়|র্থ|ষ্ঠ|ম)(?![\u0980-\u09FF])/g, "$1th");
  // Bangla counting words glued to digits: ৩টি, ৩টা -> 3
  s = s.replace(/(\d+)\s*(টি|টা|খানা)(?![\u0980-\u09FF])/g, "$1 ");
  s = s.replace(/%/g, " percent ");
  s = s.replace(/[^\p{L}\p{M}\p{N}/\s]/gu, " ");

  const out = [];
  for (const raw of s.split(/\s+/).filter(Boolean)) {
    if (CLASSIFIERS.has(raw)) continue;

    let m = raw.match(/^(\d+)(st|nd|rd|th)$/);
    if (m) {
      out.push(`#${m[1]}o`);
      continue;
    }
    if (/^\d+$/.test(raw)) {
      out.push(`#${raw}`);
      continue;
    }
    m = raw.match(/^(\d+)\/(\d+)$/);
    if (m) {
      out.push(`frac:${m[1]}/${m[2]}`);
      continue;
    }

    const num = lookupNumber(raw);
    if (num) {
      out.push(num.ord ? `#${num.n}o` : `#${num.n}`);
      continue;
    }
    if (raw in CANON) {
      out.push(CANON[raw]);
      continue;
    }
    const bnRes = BN_RE.test(raw) ? lookupBnResource(raw) : null;
    if (bnRes) {
      out.push(bnRes);
      continue;
    }
    if (/^(survive|survived|বাঁচ.*)$/.test(raw)) {
      out.push("survive");
      continue;
    }
    out.push(raw);
  }
  return out.join(" ");
}

// -----------------------------------------------------------------------------
// Language detection
// -----------------------------------------------------------------------------

const BANGLISH_MARKERS = new Set([
  "ki", "korbo", "korle", "hobe", "hole", "keno", "na", "kaj", "koro", "kore",
  "kivabe", "amar", "baki", "din", "diner", "dine", "koto", "ache", "nai",
  "tumi", "ami", "jabe", "dao", "bolo", "kemon", "ekta", "tin", "dui", "char",
  "number", "pani", "khabar", "bidyut", "jol", "kon", "ta", "te", "er",
]);

function detectLanguage(text) {
  const raw = String(text ?? "").replace(/\[Current mission:[^\]]*\]/gi, " ");
  const hasBn = BN_RE.test(raw);
  const latinWords = raw.toLowerCase().match(/[a-z]+/g) || [];
  if (hasBn) return latinWords.length >= 3 ? "mixed" : "bn";
  const hits = latinWords.filter((w) => BANGLISH_MARKERS.has(w));
  const strong = hits.filter((w) => !["number", "na", "ta", "te", "er", "tin", "char"].includes(w));
  if (strong.length >= 1 || hits.length >= 2) return "banglish";
  return "en";
}

const replyLang = (detected) =>
  detected === "bn" || detected === "mixed" ? "bn" : detected === "banglish" ? "bl" : "en";

// -----------------------------------------------------------------------------
// 2. Interpreter: find what the numbers mean
// -----------------------------------------------------------------------------

const RES_ALT = RESOURCE_KEYS.join("|");

function requestedMissionFromQuestion(rawText, canonical) {
  const original = String(rawText ?? "");
  const campaignWords =
    /\b(campaign|mission|outpost)\b/i.test(original) ||
    /\b(campaign|mission|outpost)\b/.test(canonical) ||
    /(অভিযান|মিশন|আউটপোস্ট)/.test(original);

  if (!campaignWords) return null;

  if (/\bmoon\b|\bchand(?:er)?\b|চাঁদ(?:ের|ে)?/.test(canonical) ||
      /চাঁদ/.test(original)) {
    return "moon";
  }
  if (/\bmars\b|\bmongol(?:er)?\b|মঙ্গল(?:ের|ে)?/.test(canonical) ||
      /মঙ্গল/.test(original)) {
    return "mars";
  }
  return null;
}

function interpretQuestion(rawText, ctx = {}) {
  const canon = normalize(rawText);
  const detected = detectLanguage(rawText);
  const campaignDays = ctx.campaignDays ?? DEFAULT_CAMPAIGN_DAYS[ctx.mission] ?? null;
  const entities = {};
  const intents = [];
  const requestedMission = requestedMissionFromQuestion(rawText, canon);

  // --- Fractions like 3/20 -------------------------------------------------
  const frac = canon.match(/frac:(\d+)\/(\d+)/);
  if (frac) {
    const a = Number(frac[1]);
    const b = Number(frac[2]);
    if (campaignDays && b === campaignDays) entities.dayProgress = { day: a, of: b };
    else if (ctx.objectives?.total === b) entities.objectiveProgress = { done: a, total: b };
    else entities.fraction = { a, b };
  }

  // --- Resource with a value: "oxygen 3%", "3% oxygen" ---------------------
  let m = canon.match(new RegExp(`\\b(${RES_ALT})\\b(?:\\s+\\S+){0,2}?\\s+#(\\d+)\\s+percent`));
  if (m) entities.resource = { name: m[1], value: Number(m[2]) };
  if (!entities.resource) {
    m = canon.match(new RegExp(`#(\\d+)\\s+percent\\s+(?:\\S+\\s+){0,2}?\\b(${RES_ALT})\\b`));
    if (m) entities.resource = { name: m[2], value: Number(m[1]) };
  }
  if (!entities.resource) {
    m = canon.match(new RegExp(`\\b(${RES_ALT})\\b`));
    if (m) entities.resourceMention = m[1];
  }

  // --- Score values: "score 0", "score zero", Bangla digits ---------------
  m = canon.match(/\b(?:score|points)\s+#(\d+)\b/);
  if (m) entities.scoreValue = Number(m[1]);

  // --- Remaining objective count: "3 ta objective baki" --------------------
  m = canon.match(/#(\d+)\s+(?:objective|task)(?:\s+\S+)?\s+left/) ||
      canon.match(/\bleft\s+#(\d+)\s+(?:objective|task)/);
  if (m) entities.remainingObjectives = Number(m[1]);

  // --- Campaign duration: "30 days survive korte hobe?" --------------------
  m = canon.match(/#(\d+)\s+days\b/);
  if (m) entities.durationDays = Number(m[1]);

  // --- Day reference ------------------------------------------------------
  // "3rd day", "third day", "day 3", "day three", "3 number din", "tin number diner"
  const dayPatterns = [
    /#(\d+)o\s+(?:number\s+)?day\b/,
    /#(\d+)\s+number\s+day\b/,
    /\bday\s+#(\d+)\b/,
    /#(\d+)\s+day\b/,
  ];
  for (const re of dayPatterns) {
    m = canon.match(re);
    if (m) {
      const n = Number(m[1]);
      // "30 din" when the campaign is 30 days long means duration, not Day 30
      if (campaignDays && n === campaignDays && re === dayPatterns[3]) {
        entities.durationDays = n;
      } else {
        entities.day = { value: n, source: m[0] };
      }
      break;
    }
  }

  // --- Intents ------------------------------------------------------------
  const has = (re) => re.test(canon);
  if (
    has(/\bskip\b/) ||
    has(/\bna (korle|kora|kore|hole)\b/) ||
    has(/\b(not|dont|didnt|cant|cannot)\s+(do|complete|finish)\b/) ||
    has(/\bif i (do not|dont)\b/)
  ) intents.push("skip");
  if (has(/\bki (hobe|hoy)\b/) || has(/\bwhat (happens|will happen|if)\b/) || has(/\bwhat'?s? next\b/)) intents.push("whatif");
  if (has(/\bwhy\b/)) intents.push("why");
  if (has(/\bhint\b|\bki korbo\b|\bwhat should i (do|try)\b|\bwhat do i do\b/)) intents.push("hint");
  if (has(/\bwhich day\b|\bcurrent day\b|\bwhich\b.*\bday\b|\bday koto\b|\bhowmany\b.*\bday\b.*\b(gelo|gese|done|passed)\b/)) intents.push("status");
  if (entities.scoreValue !== undefined &&
      has(/\b(win|won|winning|success|successful|succeed|score|points)\b/)) {
    intents.push("scoreOutcome");
  }
  if (
    entities.durationDays ||
    has(/\bhowmany\s+(days|day)\b/) ||
    has(/\bhow many days\b/) ||
    has(/\bsurvive\b/) ||
    has(/\bhowmany\b.*\bday\b/) ||
    has(/\btotal\b.*\bday\b/)
  ) intents.push("duration");

  return {
    original: rawText,
    canonical: canon,
    detectedLanguage: detected,
    replyLanguage: replyLang(detected),
    requestedMission,
    entities,
    intents,
  };
}

// -----------------------------------------------------------------------------
// 3. Text in three languages: en = English, bn = Bangla, bl = Banglish
// -----------------------------------------------------------------------------

const MISSION_NAME = {
  moon: { en: "Moon Outpost", bn: "চাঁদের আউটপোস্ট", bl: "Moon Outpost" },
  mars: { en: "Mars Outpost", bn: "মঙ্গলের আউটপোস্ট", bl: "Mars Outpost" },
};

const RES = {
  power: {
    name: { en: "Power", bn: "বিদ্যুৎ", bl: "Power" },
    why: {
      en: "Power runs your lights, heaters and machines. Solar panels turn sunlight into power.",
      bn: "বিদ্যুৎ দিয়ে আলো, হিটার আর যন্ত্র চলে। সোলার প্যানেল সূর্যের আলো থেকে বিদ্যুৎ বানায়।",
      bl: "Power diye alo, heater ar machine chole. Solar panel surjer alo theke power banay.",
    },
    moon: {
      en: "On the Moon, night lasts about 14 Earth days, so solar panels get no sunlight for a long time.",
      bn: "চাঁদে রাত প্রায় ১৪ পৃথিবী-দিন লম্বা, তাই অনেকদিন সোলার প্যানেল আলো পায় না।",
      bl: "Chand e raat prai 14 prithibir din lamba, tai onek din solar panel alo pay na.",
    },
    mars: {
      en: "On Mars, dust storms can cover solar panels with dust, so they make less power.",
      bn: "মঙ্গলে ধুলোঝড় সোলার প্যানেলে ধুলো জমাতে পারে, তাই প্যানেল কম বিদ্যুৎ বানায়।",
      bl: "Mongole dhulojhor solar panel e dhulo jomate pare, tai panel kom power banay.",
    },
    fix: {
      en: "Check the solar panels before you start another power-hungry task.",
      bn: "আরেকটা বেশি বিদ্যুৎ লাগা কাজ শুরু করার আগে সোলার প্যানেল দেখে নাও।",
      bl: "Aro ekta beshi power lagbe emon kaj shuru korar age solar panel dekhe nao.",
    },
  },
  water: {
    name: { en: "Water", bn: "পানি", bl: "Water" },
    why: {
      en: "Water is for drinking and growing food. A base cannot easily get more, so we save and reuse it.",
      bn: "পানি খাওয়া আর খাবার ফলাতে লাগে। বেসে সহজে নতুন পানি পাওয়া যায় না, তাই আমরা পানি বাঁচাই আর আবার ব্যবহার করি।",
      bl: "Pani khawa ar khabar folate lage. Base e shohoje notun pani paowa jay na, tai amra pani bachai ar abar bebohar kori.",
    },
    fix: {
      en: "Use water carefully and check the recycling system.",
      bn: "পানি সাবধানে ব্যবহার করো আর রিসাইকেল সিস্টেম দেখে নাও।",
      bl: "Pani sabdhane bebohar koro ar recycling system dekhe nao.",
    },
  },
  food: {
    name: { en: "Food", bn: "খাবার", bl: "Food" },
    why: {
      en: "Food gives the crew energy to work and stay healthy. Astronauts eat packed meals and can grow some plants.",
      bn: "খাবার ক্রুকে কাজ করার শক্তি দেয় আর সুস্থ রাখে। মহাকাশচারীরা প্যাক করা খাবার খায়, আর কিছু গাছও ফলাতে পারে।",
      bl: "Khabar crew ke kaj korar shokti dey ar shustho rakhe. Astronaut ra pack kora khabar khay, ar kichu gachh o folate pare.",
    },
    fix: {
      en: "Share meals wisely and look after the plants.",
      bn: "খাবার বুঝেশুনে খাও আর গাছের যত্ন নাও।",
      bl: "Khabar bujhe shune khao ar gachher jotno nao.",
    },
  },
  oxygen: {
    name: { en: "Oxygen", bn: "অক্সিজেন", bl: "Oxygen" },
    why: {
      en: "We need oxygen to breathe. With too little, astronauts feel dizzy and sleepy and cannot think clearly.",
      bn: "শ্বাস নিতে অক্সিজেন লাগে। অক্সিজেন খুব কম হলে মাথা ঘোরে, ঘুম পায়, আর ঠিকমতো ভাবা যায় না।",
      bl: "Shash nite oxygen lage. Oxygen khub kom hole matha ghore, ghum pay, ar thikmoto bhabha jay na.",
    },
    fix: {
      en: "Fix the oxygen system first, before any other task.",
      bn: "অন্য কাজের আগে অক্সিজেন সিস্টেম ঠিক করো।",
      bl: "Onno kajer age oxygen system thik koro.",
    },
  },
  shielding: {
    name: { en: "Radiation shielding", bn: "রেডিয়েশন শিল্ড", bl: "Radiation shielding" },
    why: {
      en: "Space has radiation from the Sun and stars. The Moon and Mars have no thick air to block it, so the base shielding protects the crew.",
      bn: "মহাকাশে সূর্য আর তারা থেকে বিকিরণ আসে। চাঁদ ও মঙ্গলে বিকিরণ আটকানোর মতো ঘন বাতাস নেই, তাই বেসের শিল্ড ক্রুকে রক্ষা করে।",
      bl: "Mohakashe surjo ar tara theke radiation ashe. Chand ar Mongole radiation atkanor moto ghono batas nei, tai base er shield crew ke rokkha kore.",
    },
    fix: {
      en: "Check the radiation shielding and stay inside during a solar storm.",
      bn: "রেডিয়েশন শিল্ড দেখে নাও আর সৌরঝড়ের সময় ভেতরে থাকো।",
      bl: "Radiation shield dekhe nao ar sourjhorer shomoy bhetore thako.",
    },
  },
};

const LEVEL = {
  critical: { en: "very low", bn: "খুব কম", bl: "khub kom" },
  low: { en: "low", bn: "কম", bl: "kom" },
  ok: { en: "okay", bn: "মোটামুটি", bl: "motamuti" },
  good: { en: "healthy", bn: "ভালো", bl: "bhalo" },
};

function resourceLevel(value) {
  if (value <= 10) return "critical";
  if (value <= 25) return "low";
  if (value <= 50) return "ok";
  return "good";
}

function pick(lang, obj) {
  return obj[lang] ?? obj.en;
}

function resourceWhy(key, lang, mission) {
  const info = RES[key];
  const extra = key === "power" && mission && info[mission] ? ` ${pick(lang, info[mission])}` : "";
  return `${pick(lang, info.why)}${extra}`;
}

function finish(text, lang) {
  return lang === "bn" ? asciiToBn(text) : text;
}

// -----------------------------------------------------------------------------
// Context helpers
// -----------------------------------------------------------------------------

function withDefaults(ctxIn = {}, rawText = "") {
  const prefix = String(rawText).match(/\[Current mission:\s*(moon|mars)\s*\]/i);
  const mission = (ctxIn.mission || (prefix && prefix[1].toLowerCase()) || "").toLowerCase() || null;
  return {
    ...ctxIn,
    mission,
    campaignDays: ctxIn.campaignDays ?? DEFAULT_CAMPAIGN_DAYS[mission] ?? null,
    resources: ctxIn.resources || {},
    tasks: ctxIn.tasks || [],
    survival: ctxIn.survival || null,
  };
}

const missionName = (ctx, lang) =>
  ctx.mission ? pick(lang, MISSION_NAME[ctx.mission]) : pick(lang, { en: "the mission", bn: "মিশন", bl: "mission" });

function dayLine(ctx, lang) {
  if (!ctx.day || !ctx.campaignDays) return "";
  return pick(lang, {
    en: `${missionName(ctx, lang)} · Day ${ctx.day} of ${ctx.campaignDays}`,
    bn: `${missionName(ctx, lang)} · ${ctx.day} নম্বর দিন, মোট ${ctx.campaignDays} দিনের মধ্যে`,
    bl: `${missionName(ctx, lang)} · Day ${ctx.day} of ${ctx.campaignDays}`,
  });
}

// -----------------------------------------------------------------------------
// 3a. Individual rule answers
// -----------------------------------------------------------------------------

function answerDuration(ctx, lang) {
  const n = ctx.campaignDays;
  if (!n) return null;
  return pick(lang, {
    en: `${missionName(ctx, lang)} lasts ${n} days. Your job is to keep the crew safe and the base running until the last day.`,
    bn: `${missionName(ctx, lang)} মিশনটি ${n} দিনের। শেষ দিন পর্যন্ত ক্রুকে নিরাপদ রাখা আর বেস চালু রাখাই তোমার কাজ।`,
    bl: `${missionName(ctx, lang)} mission ${n} diner. Shesh din porjonto crew ke nirapod rakha ar base chalu rakhai tomar kaj.`,
  });
}

function answerScoreOutcome(ctx, lang, scoreValue) {
  const score = scoreValue === undefined ? "zero or negative" : String(scoreValue);
  return pick(lang, {
    en: `A score of ${score} is not enough for success. AstroBase requires a positive final score, survival through the full campaign, and completed objectives.`,
    bn: `${score} স্কোরে মিশন সফল হবে না। AstroBase-এ শেষ স্কোর ধনাত্মক হতে হবে, পুরো মিশন টিকে থাকতে হবে এবং লক্ষ্যগুলো শেষ করতে হবে।`,
    bl: `${score} score diye mission successful hobe na. AstroBase e final score positive hote hobe, puro mission survive korte hobe, ar objectives shesh korte hobe.`,
  });
}

function answerUnknownSurvivalOxygen(lang) {
  return pick(lang, {
    en: "I can tell you that suit oxygen is different from the mission oxygen resource, but the exact safe-zone consequence is defined by the live survival system. Check the Survival HUD for the current suit status.",
    bn: "স্যুটের অক্সিজেন মিশনের অক্সিজেন রিসোর্সের থেকে আলাদা। নিরাপদ এলাকার ঠিক ফলাফল লাইভ সারভাইভাল সিস্টেমে নির্ধারিত হয়, তাই বর্তমান স্যুট স্ট্যাটাস Survival HUD-এ দেখো।",
    bl: "Suit oxygen mission oxygen resource theke alada. Safe-zone er exact consequence live survival system e nirdharito hoy, tai current suit status Survival HUD e dekho.",
  });
}

function answerStatus(ctx, lang) {
  if (!ctx.day || !ctx.campaignDays) return null;
  const left = ctx.campaignDays - ctx.day;
  return pick(lang, {
    en: `You are on Day ${ctx.day} of ${ctx.campaignDays} in ${missionName(ctx, lang)}. ${left} days to go.`,
    bn: `তুমি এখন ${missionName(ctx, lang)}-এর ${ctx.day} নম্বর দিনে আছো, মোট ${ctx.campaignDays} দিনের মধ্যে। আরও ${left} দিন বাকি।`,
    bl: `Tumi ekhon ${missionName(ctx, lang)} er Day ${ctx.day} te ache, mot ${ctx.campaignDays} diner moddhe. Aro ${left} din baki.`,
  });
}

function answerDayProgress(entity, ctx, lang) {
  const left = entity.of - entity.day;
  return pick(lang, {
    en: `${entity.day}/${entity.of} means Day ${entity.day} of ${entity.of}. ${left} days to go.`,
    bn: `${entity.day}/${entity.of} মানে ${entity.of} দিনের মধ্যে ${entity.day} নম্বর দিন। আরও ${left} দিন বাকি।`,
    bl: `${entity.day}/${entity.of} mane ${entity.of} diner moddhe Day ${entity.day}. Aro ${left} din baki.`,
  });
}

function answerResourceValue(name, value, ctx, lang) {
  const info = RES[name];
  const level = resourceLevel(value);
  const rn = pick(lang, info.name);
  const lv = pick(lang, LEVEL[level]);
  const why = resourceWhy(name, lang, ctx.mission);
  const fix = pick(lang, info.fix);
  const head =
    level === "critical"
      ? pick(lang, {
          en: `${rn} at ${value}% is ${lv}. This is an emergency, astronaut!`,
          bn: `${rn} ${value}% মানে ${lv}। এটা জরুরি অবস্থা, মহাকাশচারী!`,
          bl: `${rn} ${value}% mane ${lv}. Eta jaruri obostha, astronaut!`,
        })
      : pick(lang, {
          en: `${rn} at ${value}% is ${lv}.`,
          bn: `${rn} ${value}% মানে ${lv}।`,
          bl: `${rn} ${value}% mane ${lv}.`,
        });
  const tail =
    level === "good" || level === "ok"
      ? ""
      : ` ${pick(lang, { en: "What to do:", bn: "কী করবে:", bl: "Ki korbe:" })} ${fix}`;
  return `${head} ${pick(lang, { en: "Why it matters:", bn: "কেন জরুরি:", bl: "Keno jaruri:" })} ${why}${tail}`;
}

function answerResourceWhy(name, ctx, lang) {
  const rn = pick(lang, RES[name].name);
  const v = ctx.resources?.[name];
  const now =
    typeof v === "number"
      ? pick(lang, {
          en: ` Right now it is ${v}%.`,
          bn: ` এখন এটা ${v}%।`,
          bl: ` Ekhon eta ${v}%.`,
        })
      : "";
  return `${rn}: ${resourceWhy(name, lang, ctx.mission)}${now}`;
}

function answerObjectives(entity, ctx, lang) {
  const real = ctx.objectives && typeof ctx.objectives.total === "number"
    ? ctx.objectives.total - (ctx.objectives.done || 0)
    : null;
  const n = real ?? entity;
  const mismatch = real !== null && real !== entity;
  const base = pick(lang, {
    en: `You have ${n} objectives left. Do the ones that protect your crew first, then the bonus ones.`,
    bn: `তোমার ${n}টি লক্ষ্য বাকি আছে। আগে ক্রুকে রক্ষা করার কাজগুলো করো, তারপর বোনাস কাজ।`,
    bl: `Tomar ${n} ta objective baki ache. Age crew ke rokkha korar kaj gulo koro, tarpor bonus kaj.`,
  });
  const note = mismatch
    ? pick(lang, {
        en: ` (You said ${entity}, but I can see ${n} in your mission.)`,
        bn: ` (তুমি ${entity}টি বললে, কিন্তু আমি তোমার মিশনে ${n}টি দেখছি।)`,
        bl: ` (Tumi ${entity} bolle, kintu ami tomar mission e ${n} ta dekhchi.)`,
      })
    : "";
  return base + note;
}

function taskLines(task, lang) {
  const t = `"${task.title}"`;
  const lines = [];
  if (task.required) {
    lines.push(
      pick(lang, {
        en: `${t} is a required objective. If you skip it, your objective progress stays unfinished, and that can hurt mission success.`,
        bn: `${t} একটা জরুরি লক্ষ্য। এটা না করলে লক্ষ্যের অগ্রগতি অসম্পূর্ণ থাকবে, আর তাতে মিশনের সফলতা কমে যেতে পারে।`,
        bl: `${t} ekta required objective. Eta na korle objective progress adhura thakbe, ar mission er shofolota kome jete pare.`,
      })
    );
  } else {
    const bonus = task.bonusScore
      ? pick(lang, { en: `${task.bonusScore} bonus points`, bn: `${task.bonusScore} বোনাস পয়েন্ট`, bl: `${task.bonusScore} bonus point` })
      : pick(lang, { en: "a bonus", bn: "একটা বোনাস", bl: "ekta bonus" });
    lines.push(
      pick(lang, {
        en: `${t} is optional. If you skip it, you may miss ${bonus}.`,
        bn: `${t} ঐচ্ছিক কাজ। এটা না করলে ${bonus} হাতছাড়া হতে পারে।`,
        bl: `${t} optional. Eta na korle ${bonus} miss hote pare.`,
      })
    );
  }
  if (task.affects && RES[task.affects]) {
    const rn = pick(lang, RES[task.affects].name);
    const drop = typeof task.penalty === "number" ? task.penalty : null;
    lines.push(
      drop !== null
        ? pick(lang, {
            en: `It also protects ${rn}, which can drop by about ${drop}%.`,
            bn: `এটা ${rn}-ও রক্ষা করে, না করলে ${rn} প্রায় ${drop}% কমে যেতে পারে।`,
            bl: `Eta ${rn} o rokkha kore, na korle ${rn} prai ${drop}% kome jete pare.`,
          })
        : pick(lang, {
            en: `It also protects ${rn}, which can run low.`,
            bn: `এটা ${rn}-ও রক্ষা করে, না করলে ${rn} কমে যেতে পারে।`,
            bl: `Eta ${rn} o rokkha kore, na korle ${rn} kome jete pare.`,
          })
    );
  }
  const why = task.why && pick(lang, task.why);
  if (why) {
    lines.push(`${pick(lang, { en: "Why:", bn: "কেন:", bl: "Keno:" })} ${why}`);
  }
  return lines;
}

function answerSkip(parsed, ctx, lang) {
  const day = parsed.entities.day?.value ?? ctx.day ?? null;
  const notes = [];

  if (day && ctx.campaignDays && day > ctx.campaignDays) {
    return pick(lang, {
      en: `There is no Day ${day}. ${missionName(ctx, lang)} only has ${ctx.campaignDays} days.`,
      bn: `${day} নম্বর দিন বলে কিছু নেই। ${missionName(ctx, lang)} মিশনে মোট ${ctx.campaignDays} দিন।`,
      bl: `Day ${day} bole kichu nei. ${missionName(ctx, lang)} mission e mot ${ctx.campaignDays} din.`,
    });
  }
  if (day && ctx.day && day < ctx.day) {
    notes.push(
      pick(lang, {
        en: `Day ${day} is already over. You are on Day ${ctx.day}.`,
        bn: `${day} নম্বর দিন শেষ হয়ে গেছে। তুমি এখন ${ctx.day} নম্বর দিনে আছো।`,
        bl: `Day ${day} shesh hoye geche. Tumi ekhon Day ${ctx.day} te ache.`,
      })
    );
  } else if (day && ctx.day && day > ctx.day) {
    notes.push(
      pick(lang, {
        en: `Day ${day} has not started yet. You are on Day ${ctx.day}.`,
        bn: `${day} নম্বর দিন এখনো শুরু হয়নি। তুমি এখন ${ctx.day} নম্বর দিনে আছো।`,
        bl: `Day ${day} ekhono shuru hoyni. Tumi ekhon Day ${ctx.day} te ache.`,
      })
    );
  }

  let tasks = day ? ctx.tasks.filter((t) => t.day === day) : [];
  if (parsed.entities.resourceMention) {
    const byResource = tasks.filter((t) => t.affects === parsed.entities.resourceMention);
    if (byResource.length) tasks = byResource;
  }
  const pending = tasks.filter((t) => t.status !== "done");

  const head = day
    ? pick(lang, {
        en: `Good question, astronaut! Here is what happens if you skip Day ${day} tasks.`,
        bn: `দারুণ প্রশ্ন, মহাকাশচারী! ${day} নম্বর দিনের কাজ না করলে কী হয়, শোনো।`,
        bl: `Darun proshno, astronaut! Day ${day} er kaj na korle ki hoy, shuno.`,
      })
    : pick(lang, {
        en: "Good question, astronaut! What happens if you skip a task depends on the task.",
        bn: "দারুণ প্রশ্ন, মহাকাশচারী! কোনো কাজ না করলে কী হবে, তা কাজটার ওপর নির্ভর করে।",
        bl: "Darun proshno, astronaut! Kono kaj na korle ki hobe, ta kajta r upor nirbhor kore.",
      });

  if (tasks.length && pending.length === 0) {
    return [
      ...notes,
      pick(lang, {
        en: `All the tasks for Day ${day} are already done. Nothing to skip!`,
        bn: `${day} নম্বর দিনের সব কাজ আগেই শেষ। বাদ দেওয়ার কিছু নেই!`,
        bl: `Day ${day} er shob kaj agei shesh. Skip korar kichu nei!`,
      }),
    ].join(" ");
  }

  if (pending.length) {
    const body = pending.flatMap((t) => taskLines(t, lang)).join(" ");
    const tip = pick(lang, {
      en: "Tip: do the required tasks and the ones that protect your resources first.",
      bn: "টিপ: আগে জরুরি কাজ আর যেগুলো রিসোর্স বাঁচায় সেগুলো করো।",
      bl: "Tip: Age required kaj ar jegulo resource bachay segulo koro.",
    });
    return [head, ...notes, body, tip].join(" ");
  }

  // No task data for that day: be honest, give the general idea.
  const honest = pick(lang, {
    en: "I cannot see the exact rule for this task yet, so here is the general idea:",
    bn: "এই কাজের ঠিক নিয়মটা আমি এখনো দেখতে পাচ্ছি না, তাই সাধারণ ধারণাটা বলি:",
    bl: "Ei kajer thik niyomta ami ekhono dekhte pachhi na, tai shadharon dharona boli:",
  });
  const general = pick(lang, {
    en: "If it is optional, you may miss a bonus. If it is a required objective, your progress stays unfinished and mission success can drop. If it protects Power, Water, Food or Oxygen, that resource can run low.",
    bn: "ঐচ্ছিক হলে বোনাস হাতছাড়া হতে পারে। জরুরি লক্ষ্য হলে অগ্রগতি অসম্পূর্ণ থাকবে আর মিশনের সফলতা কমতে পারে। বিদ্যুৎ, পানি, খাবার বা অক্সিজেন রক্ষার কাজ হলে ওই রিসোর্স কমে যেতে পারে।",
    bl: "Optional hole bonus miss hote pare. Required objective hole progress adhura thakbe ar mission shofolota kome jete pare. Power, Water, Food ba Oxygen bachanor kaj hole oi resource kome jete pare.",
  });
  const tip = pick(lang, {
    en: "Tip: open the task card, read the details, then choose which task to do first.",
    bn: "টিপ: টাস্ক কার্ড খুলে বিস্তারিত পড়ো, তারপর ঠিক করো কোনটা আগে করবে।",
    bl: "Tip: Task card khule details poro, tarpor thik koro konta age korbe.",
  });
  return [head, ...notes, honest, general, tip].join(" ");
}

function answerDayInfo(parsed, ctx, lang) {
  const day = parsed.entities.day.value;
  if (ctx.campaignDays && day > ctx.campaignDays) {
    return pick(lang, {
      en: `There is no Day ${day}. ${missionName(ctx, lang)} only has ${ctx.campaignDays} days.`,
      bn: `${day} নম্বর দিন বলে কিছু নেই। ${missionName(ctx, lang)} মিশনে মোট ${ctx.campaignDays} দিন।`,
      bl: `Day ${day} bole kichu nei. ${missionName(ctx, lang)} mission e mot ${ctx.campaignDays} din.`,
    });
  }
  const tasks = ctx.tasks.filter((t) => t.day === day);
  if (!tasks.length) return null; // no task data: let the model answer with the FACTS block
  const titles = tasks.map((t) => `"${t.title}"${t.required ? "*" : ""}`).join(", ");
  return pick(lang, {
    en: `Day ${day} tasks: ${titles}. A * means it is a required objective.`,
    bn: `${day} নম্বর দিনের কাজ: ${titles}। * চিহ্ন মানে এটা জরুরি লক্ষ্য।`,
    bl: `Day ${day} er kaj: ${titles}. * mane eta required objective.`,
  });
}

// -----------------------------------------------------------------------------
// 4. Mission-aware hints
// -----------------------------------------------------------------------------

/**
 * Picks the most useful hint for the current moment.
 * Returns { key, text } or null. `key` identifies the situation so the
 * frontend can avoid repeating the same hint.
 */
function buildHint(ctxIn, lang = "en") {
  const ctx = withDefaults(ctxIn);
  const entries = Object.entries(ctx.resources).filter(([k, v]) => RES[k] && typeof v === "number");
  const lowest = entries.sort((a, b) => a[1] - b[1])[0];

  if (lowest && lowest[1] <= 30) {
    const [name, value] = lowest;
    const level = resourceLevel(value);
    const rn = pick(lang, RES[name].name);
    const text = pick(lang, {
      en: `Hint: your ${rn} is ${pick(lang, LEVEL[level])} (${value}%). ${pick(lang, RES[name].fix)} Why? ${resourceWhy(name, lang, ctx.mission)}`,
      bn: `হিন্ট: তোমার ${rn} ${pick(lang, LEVEL[level])} (${value}%)। ${pick(lang, RES[name].fix)} কেন? ${resourceWhy(name, lang, ctx.mission)}`,
      bl: `Hint: tomar ${rn} ${pick(lang, LEVEL[level])} (${value}%). ${pick(lang, RES[name].fix)} Keno? ${resourceWhy(name, lang, ctx.mission)}`,
    });
    return { key: `resource:${name}:${level}`, text: finish(text, lang) };
  }

  const todays = ctx.tasks.filter((t) => t.day === ctx.day && t.status !== "done");
  const required = todays.find((t) => t.required) || todays[0];
  if (required) {
    const why = required.why && pick(lang, required.why);
    const text = pick(lang, {
      en: `Hint: today's ${required.required ? "required " : ""}task is "${required.title}".${why ? ` Why? ${why}` : ""}`,
      bn: `হিন্ট: আজকের ${required.required ? "জরুরি " : ""}কাজ "${required.title}"।${why ? ` কেন? ${why}` : ""}`,
      bl: `Hint: ajker ${required.required ? "required " : ""}kaj "${required.title}".${why ? ` Keno? ${why}` : ""}`,
    });
    return { key: `task:${required.id ?? required.title}`, text: finish(text, lang) };
  }

  const text = pick(lang, {
    en: "Hint: check your resource bars first, then pick the task that protects your crew.",
    bn: "হিন্ট: আগে রিসোর্স বারগুলো দেখো, তারপর যে কাজ ক্রুকে রক্ষা করে সেটা বেছে নাও।",
    bl: "Hint: age resource bar gulo dekho, tarpor je kaj crew ke rokkha kore seta beche nao.",
  });
  return { key: "generic", text: finish(text, lang) };
}

/** Returns a hint only when the situation changed since lastKey. */
function hintTrigger(ctx, lastKey, lang = "en") {
  const hint = buildHint(ctx, lang);
  if (!hint || hint.key === "generic" || hint.key === lastKey) return null;
  return hint;
}

// -----------------------------------------------------------------------------
// 5. Rules router + model prompt
// -----------------------------------------------------------------------------

function answerFromRules(parsed, ctx) {
  const lang = parsed.replyLanguage;
  const { entities, intents } = parsed;
  const has = (i) => intents.includes(i);
  let text = null;
  // Real-world questions ("how many days to travel to Mars?") are not about the game.
  const realWorld = /\b(nasa|esa|spacex|isro|travel|journey|reach|real|orbit|light|years?|hours?|minutes?|jete|lage|lagbe|pouchate|pouchabo)\b/.test(parsed.canonical) ||
    /(যেতে|লাগে|লাগবে|পৌঁছ)/.test(parsed.original || "");

  const survivalOxygenQuestion =
    /\b(suit|spacesuit|safe zone|survival)\b/.test(parsed.canonical) &&
    parsed.entities.resourceMention === "oxygen";

  if (survivalOxygenQuestion) {
    text = answerUnknownSurvivalOxygen(lang);
  } else if (has("scoreOutcome")) {
    text = answerScoreOutcome(ctx, lang, entities.scoreValue);
  } else if (entities.dayProgress && !has("skip")) {
    text = answerDayProgress(entities.dayProgress, ctx, lang);
  } else if (has("skip")) {
    text = answerSkip(parsed, ctx, lang);
  } else if (entities.day && (has("whatif") || intents.length === 0)) {
    text = answerDayInfo(parsed, ctx, lang);
  } else if (entities.resource && (has("whatif") || has("why") || intents.length === 0)) {
    text = answerResourceValue(entities.resource.name, entities.resource.value, ctx, lang);
  } else if (entities.resourceMention && has("why")) {
    text = answerResourceWhy(entities.resourceMention, ctx, lang);
  } else if (typeof entities.remainingObjectives === "number") {
    text = answerObjectives(entities.remainingObjectives, ctx, lang);
  } else if (has("duration") && !realWorld) {
    const requestedMission = parsed.requestedMission;
    const durationCtx = requestedMission
      ? { ...ctx, mission: requestedMission, campaignDays: DEFAULT_CAMPAIGN_DAYS[requestedMission] }
      : ctx;
    text = answerDuration(durationCtx, lang);
  } else if (has("status") && !realWorld) {
    text = answerStatus(ctx, lang);
  } else if (has("hint")) {
    text = buildHint(ctx, lang)?.text ?? null;
  }
  return text ? finish(text, lang) : null;
}

const LANG_NAME = {
  en: "English",
  bn: "Bangla (Bengali script)",
  bl: "Banglish (Bangla written in English letters)",
};

function buildNovaPrompt(question, parsed, ctx) {
  const lang = parsed.replyLanguage;
  const facts = [];
  if (ctx.mission) facts.push(`Mission: ${MISSION_NAME[ctx.mission].en}`);
  if (ctx.day && ctx.campaignDays) facts.push(`Day: ${ctx.day} of ${ctx.campaignDays}`);
  const res = Object.entries(ctx.resources || {})
    .filter(([k]) => RES[k])
    .map(([k, v]) => `${k} ${v}%`)
    .join(", ");
  if (res) facts.push(`Resources: ${res}`);
  if (ctx.objectives) facts.push(`Objectives: ${ctx.objectives.done || 0} of ${ctx.objectives.total} done`);
  const todays = (ctx.tasks || []).filter((t) => t.day === ctx.day);
  if (todays.length) {
    facts.push(
      "Today's tasks: " +
        todays.map((t) => `${t.title} (${t.required ? "required" : "optional"}, ${t.status || "pending"})`).join("; ")
    );
  }

  const understood = [];
  const e = parsed.entities;
  if (e.day) understood.push(`the player means Mission Day ${e.day.value}`);
  if (e.resource) understood.push(`the player means ${e.resource.name} at ${e.resource.value}%`);
  if (typeof e.remainingObjectives === "number") understood.push(`the player means ${e.remainingObjectives} objectives left`);
  if (e.durationDays) understood.push(`the player means a campaign length of ${e.durationDays} days`);

  const system = [
    "You are Nova, a friendly mission companion in the AstroBase space game. The players are children aged 8 to 14.",
    "Use short sentences and simple words. Explain WHY in one sentence.",
    "Use only the FACTS below. Never invent game rules or numbers. If the FACTS do not answer the question, say you are not sure and suggest checking the task card.",
    `Reply in ${LANG_NAME[lang]}. Use at most 5 sentences.`,
  ].join(" ");

  const user = [
    "FACTS:",
    ...facts.map((f) => `- ${f}`),
    understood.length ? `- Question understood as: ${understood.join("; ")}` : "",
    "",
    `Player question: ${normalizeForPrompt(question)}`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  return { system, user };
}

const normalizeForPrompt = (q) => String(q ?? "").replace(/\[Current mission:[^\]]*\]/gi, "").trim();

// -----------------------------------------------------------------------------
// Single entry point
// -----------------------------------------------------------------------------

/**
 * @returns {{ parsed, answer: string|null, prompt: {system,user}|null }}
 *   answer  -> send straight back to the player (no model call needed)
 *   prompt  -> send to Ollama when answer is null
 */
function handleNovaQuestion(rawText, ctxIn = {}) {
  const ctx = withDefaults(ctxIn, rawText);
  const parsed = interpretQuestion(rawText, ctx);
  const answer = answerFromRules(parsed, ctx);
  return {
    parsed,
    answer,
    prompt: answer ? null : buildNovaPrompt(rawText, parsed, ctx),
  };
}

// -----------------------------------------------------------------------------
// Helpers for server.js
// -----------------------------------------------------------------------------

/**
 * Cleans the state object sent by the browser. Never trust the client:
 * numbers are clamped, strings are shortened, unknown fields are dropped.
 */
function contextFromClientState(raw, missionKey) {
  const r = raw && typeof raw === "object" ? raw : {};
  const num = (v, lo, hi) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : undefined;
  };
  const mission = String(r.mission || missionKey || "").toLowerCase();
  const ctx = { mission: mission === "moon" || mission === "mars" ? mission : null };

  const campaignDays = num(r.campaignDays, 1, 365);
  if (campaignDays !== undefined) ctx.campaignDays = campaignDays;
  const day = num(r.day, 0, 365);
  if (day !== undefined) ctx.day = day;
  const score = num(r.score, -1e6, 1e6);
  if (score !== undefined) ctx.score = score;

  const resources = {};
  for (const key of RESOURCE_KEYS) {
    const v = num(r.resources?.[key] ?? r[key], 0, 100);
    if (v !== undefined) resources[key] = v;
  }
  ctx.resources = resources;

  if (r.objectives && typeof r.objectives === "object") {
    const total = num(r.objectives.total, 0, 1000);
    const done = num(r.objectives.done, 0, 1000);
    if (total !== undefined) ctx.objectives = { total, done: done ?? 0 };
  }

  if (typeof r.missionStatus === "string" &&
      ["active", "failed", "success"].includes(r.missionStatus)) {
    ctx.missionStatus = r.missionStatus;
  }

  if (r.survival && typeof r.survival === "object") {
    const survival = {};
    for (const [key, limits] of Object.entries({
      oxygen: [0, 100],
      health: [0, 100],
      radius: [0, 1000],
      distToEdge: [-1000, 1000],
    })) {
      const value = num(r.survival[key], limits[0], limits[1]);
      if (value !== undefined) survival[key] = value;
    }
    if (typeof r.survival.inZone === "boolean") survival.inZone = r.survival.inZone;
    if (typeof r.survival.failed === "boolean") survival.failed = r.survival.failed;
    if (["safe", "danger", "critical", "failed"].includes(r.survival.status)) {
      survival.status = r.survival.status;
    }
    if (Object.keys(survival).length) ctx.survival = survival;
  }

  ctx.tasks = (Array.isArray(r.tasks) ? r.tasks : []).slice(0, 60).map((t) => {
    const task = {
      id: String(t?.id ?? "").slice(0, 40),
      day: num(t?.day, 0, 365),
      title: String(t?.title ?? "").replace(/[\r\n]+/g, " ").slice(0, 80),
      required: Boolean(t?.required),
      status: t?.status === "done" ? "done" : "pending",
    };
    if (RES[t?.affects]) task.affects = t.affects;
    const penalty = num(t?.penalty, 0, 100);
    if (penalty !== undefined) task.penalty = penalty;
    const bonus = num(t?.bonusScore, 0, 1000);
    if (bonus !== undefined) task.bonusScore = bonus;
    return task;
  }).filter((t) => t.title && t.day !== undefined);

  return ctx;
}

/**
 * Text to append to your existing system prompt before calling Ollama.
 * It adds the kid-friendly style, the reply language and the live mission facts.
 */
function novaAddendum(rawText, ctxIn = {}) {
  const ctx = withDefaults(ctxIn, rawText);
  const parsed = interpretQuestion(rawText, ctx);
  const { user } = buildNovaPrompt(rawText, parsed, ctx);
  const factsBlock = user.split("\nPlayer question:")[0].trim();
  const style = [
    "Style for this answer: the players are children aged 8 to 14.",
    "Use short sentences and simple words, and explain WHY in one sentence.",
    `Reply in ${LANG_NAME[parsed.replyLanguage]}. Use at most 5 sentences.`,
    "For game rules and numbers, use only the game facts above and the live facts below. Never invent them.",
  ].join(" ");
  return `${style}\n${factsBlock}`;
}

module.exports = {
  normalize,
  detectLanguage,
  interpretQuestion,
  resourceLevel,
  withDefaults,
  buildHint,
  hintTrigger,
  answerFromRules,
  buildNovaPrompt,
  handleNovaQuestion,
  contextFromClientState,
  novaAddendum,
};