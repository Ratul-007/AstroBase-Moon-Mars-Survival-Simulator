'use strict';
const { answerFromDashboard, readDashboard, statusOf } = require('./dashboardAnswers.js');

let passed = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) passed++;
  else failures.push(`${name}${detail ? ` -> ${detail}` : ''}`);
}
const ask = (q, state) => answerFromDashboard(q, state);

// Same shape as the event objects built by missionEngine.buildEvents() + attachTask().
const EVENT = {
  id: 'moon-01',
  title: 'Solar Array Dust Buildup',
  description: "Dust is reducing the habitat's solar power generation.",
  type: 'power',
  severity: 'warning',
  day: 1,
  choices: [
    { id: 'moon-01-choice-1', label: 'Repair and stabilize the power system: Solar Array Dust Buildup', effects: { power: 8, water: -2 }, score: 15, feedback: 'x' },
    { id: 'moon-01-choice-2', label: 'Switch to essential-load mode: Solar Array Dust Buildup', effects: { power: 4, oxygen: -1 }, score: 8, feedback: 'x' },
    { id: 'moon-01-choice-3', label: 'Defer the power intervention: Solar Array Dust Buildup', effects: { power: -10 }, score: -12, feedback: 'x' }
  ],
  task: {
    title: 'Service the solar array',
    steps: [
      { stationId: 'a', action: 'Go to the solar array', doneText: 'x' },
      { stationId: 'b', action: 'Clean the panels', doneText: 'y' }
    ],
    choiceIndex: 0
  }
};
const NO_TASK_EVENT = { ...EVENT, id: 'moon-02', title: 'Water Recycling Leak', task: undefined };

// Same shape as NovaPanel.jsx builds. This one mirrors the real final Moon Outpost screen.
const FULL = {
  mission: 'moon',
  campaignDays: 20,
  day: 20,
  score: 453,
  resources: { power: 23, water: 89, food: 91, oxygen: 97, shielding: 100 },
  objectives: { total: 3, done: 3 },
  missionStatus: 'success',
  currentEvent: null,
  resolvedEventIds: [],
  eventCount: 20,
  log: [],
  taskProgress: { eventId: null, stepIndex: 0 },
  survival: { oxygen: 74, health: 100, radius: 24, inZone: false, failed: false, distToEdge: 3, status: 'danger' }
};
const MID = {
  ...FULL, day: 5, missionStatus: 'active', objectives: { total: 3, done: 1 }, eventCount: 4,
  currentEvent: EVENT, taskProgress: { eventId: 'moon-01', stepIndex: 1 }
};

/* ---- status labels match missionEngine.getResourceStatus ---- */
check('status thresholds', statusOf(0) === 'CRITICAL' && statusOf(24.9) === 'LOW' && statusOf(25) === 'CAUTION' && statusOf(49) === 'CAUTION' && statusOf(50) === 'STABLE');

/* ---- exact live values ---- */
let r = ask('What is my current oxygen level?', FULL);
check('oxygen level', r && /Oxygen is at 97% \(STABLE\)/.test(r.reply) && r.source === 'dashboard-live', r && r.reply);
check('oxygen note separates suit oxygen', r && /suit oxygen/i.test(r.reply));

r = ask('[Current mission: Moon] what is my power level', FULL);
check('prefix stripped, power LOW', r && /Power is at 23% \(LOW\)/.test(r.reply) && /lowest/.test(r.reply), r && r.reply);

r = ask('Which day am I in?', MID);
check('which day', r && /day 5 of 20/.test(r.reply) && /Moon Outpost/.test(r.reply), r && r.reply);

r = ask('How many days are left?', MID);
check('days remaining', r && /15 days remain/.test(r.reply), r && r.reply);

r = ask('How many days left?', FULL);
check('final day', r && /final mission day/.test(r.reply), r && r.reply);

r = ask('Which resource is lowest right now?', FULL);
check('lowest resource', r && /Power at 23% \(LOW\)/.test(r.reply) && /Water 89%/.test(r.reply), r && r.reply);

r = ask('What is my score?', FULL);
check('score', r && /453/.test(r.reply), r && r.reply);

r = ask('How many objectives have I completed?', MID);
check('objectives', r && /1 of 3/.test(r.reply), r && r.reply);

r = ask('How many events have I resolved?', FULL);
check('events resolved', r && /20 of 20/.test(r.reply), r && r.reply);

r = ask('Tell me my exact current resources without guessing.', FULL);
check('summary', r && /Power 23% \(LOW\)/.test(r.reply) && /Radiation Shielding 100%/.test(r.reply) && /Objectives: 3\/3/.test(r.reply) && /completed successfully/.test(r.reply), r && r.reply);

r = ask('What is my radiation shielding level?', FULL);
check('shielding key', r && /Radiation Shielding is at 100%/.test(r.reply), r && r.reply);

/* ---- zero-resource hypotheticals use the existing rule, never invented mechanics ---- */
for (const resource of ['power', 'water', 'food', 'oxygen', 'shielding']) {
  r = ask(`What happens if my ${resource} reaches zero?`, FULL);
  check(`zero-resource rule: ${resource}`, r && r.source === 'dashboard-live' && /critical resource reaching zero can fail the mission immediately/i.test(r.reply), r && r.reply);
}
r = ask('What happens if my suit oxygen reaches zero?', FULL);
check('zero suit oxygen explains survival mechanics',
  r && r.source === 'dashboard-live' &&
  /2-second grace period/i.test(r.reply) &&
  /4 percentage points per second/i.test(r.reply) &&
  /health drains at 6 points per second/i.test(r.reply) &&
  /health reaches 0/i.test(r.reply) &&
  /separate from mission oxygen/i.test(r.reply), r && r.reply);

r = ask('What happens if my mission oxygen reaches zero?', FULL);
check('zero mission oxygen uses mission rule', r && /critical resource reaching zero can fail the mission immediately/i.test(r.reply) && !/grace period/i.test(r.reply), r && r.reply);

/* ---- risk is not equated with the lowest snapshot ---- */
r = ask('Which resource is most at risk right now?', MID);
check('risk explains uncertainty', r && /snapshot, not a proven risk ranking/i.test(r.reply) && /current event, choice effects/i.test(r.reply) && /All live levels/i.test(r.reply), r && r.reply);

/* ---- current choice advice uses only supplied event effects ---- */
r = ask('Which choice should I take for the current event, and why?', MID);
check('choice advice compares live effects',
  r && r.source === 'dashboard-live' &&
  /Trade-offs for the current event/i.test(r.reply) &&
  /1\)/.test(r.reply) &&
  /\+8% Power, -2% Water, \+15 score/i.test(r.reply) &&
  /No choice guarantees mission success/i.test(r.reply), r && r.reply);
r = ask('Which choice should I take for the current event?', { ...MID, currentEvent: { ...EVENT, choices: [] } });
check('choice advice admits missing effects', r && r.source === 'dashboard-missing' && /can't see your current event/i.test(r.reply), r && r.reply);

/* ---- trends require supplied history and never predict from one snapshot ---- */
const WITH_HISTORY = {
  ...MID,
  history: [
    { day: 1, resources: { power: 80, water: 75 } },
    { day: 3, resources: { power: 65, water: 78 } },
    { day: 5, resources: { power: 50, water: 70 } }
  ]
};
r = ask('What is the trend of my power?', WITH_HISTORY);
check('power trend', r && /80% to 50%/.test(r.reply) && /down by 30/.test(r.reply) && /does not predict depletion/.test(r.reply), r && r.reply);
r = ask('Are my water levels going down?', WITH_HISTORY);
check('water trend', r && /75% to 70%/.test(r.reply) && /down by 5/.test(r.reply), r && r.reply);
r = ask('How has my water level changed over time?', WITH_HISTORY);
check('water changed over time', r && /75% to 70%/.test(r.reply) && /down by 5/.test(r.reply), r && r.reply);
r = ask('What is the trend of my food?', WITH_HISTORY);
check('insufficient resource trend', r && r.source === 'dashboard-missing' && /at least two historical/i.test(r.reply), r && r.reply);
r = ask('What is the trend of my power?', { ...FULL, resources: { power: 50 } });
check('single snapshot is not a trend', r && r.source === 'dashboard-missing' && /at least two historical/i.test(r.reply), r && r.reply);

/* ---- certificate policy is not invented ---- */
r = ask('Mission fail hole ki certificate pabo?', { ...MID, missionStatus: 'failed' });
check('failed certificate policy', r && /only after a successful mission/i.test(r.reply) && /status is failed/i.test(r.reply), r && r.reply);
r = ask('Can I get a certificate?', { ...MID, missionStatus: undefined });
check('unknown certificate status', r && /cannot determine certificate eligibility/i.test(r.reply), r && r.reply);

/* ---- current event, choices and field task (exact data from the game) ---- */
r = ask('What is my current event?', MID);
check('event only', r && /"Solar Array Dust Buildup" \[Warning\]/.test(r.reply) && /day 5/.test(r.reply) && !/Your choices/.test(r.reply), r && r.reply);

r = ask('What are my choices?', MID);
check('choices list', r && /1\) Repair and stabilize the power system \(\+8% Power, -2% Water, \+15 score\)/.test(r.reply)
  && /3\) Defer the power intervention \(-10% Power, -12 score\)/.test(r.reply) && !/: Solar Array Dust Buildup/.test(r.reply), r && r.reply);

r = ask('Amar current event ta ki, ar amar choices ki?', MID);
check('banglish event + choices', r && /Ekhon-er event/.test(r.reply) && /Apnar choices:/.test(r.reply), r && r.reply);

r = ask('What is my current task?', MID);
check('field task step 2 of 2', r && /step 2 of 2: Clean the panels/.test(r.reply) && /Repair and stabilize the power system/.test(r.reply), r && r.reply);

r = ask('What is my current task?', { ...MID, taskProgress: { eventId: 'moon-01', stepIndex: 0 } });
check('field task step 1', r && /step 1 of 2: Go to the solar array/.test(r.reply), r && r.reply);

r = ask('What is my current task?', { ...MID, taskProgress: { eventId: 'some-other-event', stepIndex: 1 } });
check('stale taskProgress ignored', r && /step 1 of 2/.test(r.reply), r && r.reply);

r = ask('What is my current task?', { ...MID, currentEvent: NO_TASK_EVENT });
check('event without field task', r && /no 3D field task/.test(r.reply), r && r.reply);

r = ask('What is my current event?', FULL);
check('no event after mission ended', r && /no active event/.test(r.reply) && /completed successfully/.test(r.reply), r && r.reply);

/* ---- suit oxygen vs mission oxygen ---- */
r = ask('What is my suit oxygen?', FULL);
check('suit oxygen is survival value', r && /74%/.test(r.reply) && /97%/.test(r.reply), r && r.reply);
r = ask('Am I in the safe zone?', FULL);
check('safe zone', r && /outside the safe zone/.test(r.reply) && /Health: 100%/.test(r.reply), r && r.reply);
r = ask('Am I in the safe zone?', { ...FULL, survival: { oxygen: 0, health: 60, inZone: false, status: 'critical' } });
check('critical status explained', r && /health is draining/.test(r.reply), r && r.reply);

/* ---- Banglish and Bangla ---- */
r = ask('amar oxygen koto?', FULL);
check('banglish oxygen', r && /97%/.test(r.reply) && /Apnar/.test(r.reply), r && r.reply);
r = ask('ami kon din e achi?', MID);
check('banglish day', r && /5 number dine/.test(r.reply), r && r.reply);
r = ask('power koto %?', FULL);
check('banglish power', r && /23% \(LOW\)/.test(r.reply), r && r.reply);
r = ask('আমার অক্সিজেন কত?', FULL);
check('bangla oxygen', r && /97%/.test(r.reply) && /আপনার/.test(r.reply), r && r.reply);
r = ask('আমি কোন দিনে আছি?', MID);
check('bangla day', r && /5 নম্বর দিনে/.test(r.reply), r && r.reply);
r = ask('আমার স্কোর কত?', FULL);
check('bangla score', r && /453/.test(r.reply), r && r.reply);
r = ask('আমার বর্তমান ইভেন্ট কী?', MID);
check('bangla event', r && /বর্তমান ইভেন্ট/.test(r.reply) && /Solar Array Dust Buildup/.test(r.reply), r && r.reply);

/* ---- missing data is admitted, never invented ---- */
r = ask('What is my current oxygen level?', null);
check('no state', r && r.source === 'dashboard-missing' && /can't see/.test(r.reply), r && r.reply);
r = ask('What is my radiation shielding level?', { resources: { power: 50 } });
check('missing shielding', r && r.source === 'dashboard-missing', r && r.reply);
r = ask('What is my suit oxygen?', { resources: { oxygen: 50 } });
check('missing survival', r && r.source === 'dashboard-missing', r && r.reply);
r = ask('Which day am I in?', { resources: { power: 50 } });
check('missing day', r && r.source === 'dashboard-missing', r && r.reply);
r = ask('How many objectives are done?', { objectives: [{ title: 'x' }] });
check('unrecognised objectives shape is not guessed', r && r.source === 'dashboard-missing', r && r.reply);
r = ask('What is my current event?', { ...FULL, missionStatus: 'active', currentEvent: undefined });
check('active mission with no event data', r && r.source === 'dashboard-missing', r && r.reply);

/* ---- must NOT hijack: advice, hypotheticals, science, rules ---- */
const mustPass = [
  'What should I do if my power is low?',
  'What is Mars?',
  'Why is Mars red?',
  'What is oxygen?',
  'What is the oxygen level on Mars?',
  'How much water is on the Moon?',
  'How much oxygen do astronauts need per day?',
  'Mars campaign e total koy din survive korte hobe?',
  'How many days is the Moon campaign?',
  'amar score 0 hole ki ami win korbo?',
  'What happens if my score is negative on Day 30?',
  'Mission oxygen ar suit oxygen ki same jinis?',
  'Safe zone er baire gele oxygen ki immediately kome?',
  'Ami safe zone e fire ashle oxygen ki refill hobe?',
  'Ami jodi Day 5 er task skip kori, tahole ki mission fail korbe?',
  '3rd day te task na korle ki hobe?',
  'Do events repeat?',
  'How does the daily event work?',
  'What day was Apollo 11 launched?',
  'মঙ্গল অভিযানে মোট কত দিন বাঁচতে হবে?',
  'পাওয়ার কমে গেলে আমার কী করা উচিত?',
  'tell me a joke',
  'hello'
];
for (const q of mustPass) {
  const out = ask(q, MID);
  check(`passes through: ${q}`, out === null, out && out.reply);
}

/* ---- sanitising ---- */
const d = readDashboard({ resources: { power: 'abc', water: null, oxygen: 55, radiation: 40 }, day: -3, survival: 'x' });
check('sanitise: bad values dropped', d && !('power' in d.resources) && !('water' in d.resources) && d.resources.oxygen === 55 && d.day === undefined && d.survival === undefined);
check('sanitise: radiation alias maps to shielding only', d && d.resources.shielding === 40 && !('radiation' in d.resources));
check('sanitise: non-object', readDashboard('hi') === null && readDashboard([1]) === null);
const big = readDashboard({ currentEvent: { title: 'T'.repeat(500), description: 'D'.repeat(2000), choices: Array.from({ length: 50 }, () => ({ label: 'L', effects: { power: 1, hacked: 99 }, score: 1 })) } });
check('sanitise: event size capped, unknown resource keys dropped',
  big.event.title.length === 120 && big.event.description.length === 300 && big.event.choices.length === 5 && !('hacked' in big.event.choices[0].effects));
check('sanitise: survival status whitelist', readDashboard({ survival: { oxygen: 1, status: '<script>' } }).survival.status === undefined);
const history = readDashboard({
  history: [
    { day: 1, resources: { power: 80, radiation: 70, hacked: 99 } },
    { day: 2, resources: { power: 75, radiation: 65, hacked: 99 } }
  ]
});
check('sanitise: history keeps known resources only',
  history.history.length === 2 &&
  history.history[0].resources.power === 80 &&
  history.history[0].resources.shielding === 70 &&
  !('hacked' in history.history[0].resources));

console.log(`${passed} passed, ${failures.length} failed`);
if (failures.length) {
  failures.forEach(x => console.log('FAIL:', x));
  process.exit(1);
}