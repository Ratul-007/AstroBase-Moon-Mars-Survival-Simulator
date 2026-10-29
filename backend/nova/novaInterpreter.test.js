// Run with:  node novaInterpreter.test.js
const assert = require("node:assert/strict");
const {
  normalize,
  detectLanguage,
  interpretQuestion,
  handleNovaQuestion,
  buildHint,
  hintTrigger,
  contextFromClientState,
  novaAddendum,
} = require("./novaInterpreter.js");

const mars = {
  mission: "mars",
  campaignDays: 30,
  day: 3,
  resources: { power: 22, water: 70, food: 55, oxygen: 80, radiation: 60 },
  objectives: { total: 5, done: 2 },
  tasks: [
    { id: "solar", day: 3, title: "Clean the solar panels", required: true, status: "pending", affects: "power", penalty: 10,
      why: { en: "Dust on the panels blocks sunlight.", bn: "ধুলো প্যানেলের আলো আটকে দেয়।", bl: "Dhulo panel er alo atke dey." } },
    { id: "photo", day: 3, title: "Photograph the crater", required: false, status: "pending", bonusScore: 5 },
    { id: "d4", day: 4, title: "Check the rover", required: true, status: "pending" },
  ],
};

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("  ok   ", name); }
  catch (e) { console.log("  FAIL ", name, "\n       ", e.message); process.exitCode = 1; }
}
const parse = (q, ctx = mars) => interpretQuestion(q, ctx);

console.log("\nDay references (all must mean Mission Day 3)");
for (const q of [
  "3rd day te ki hobe?", "day 3 e ki hobe", "day three task skip korle?",
  "third day e ki hobe", "tin number diner kaj na korle?", "3 number din e ki hobe",
  "তৃতীয় দিনে কি হবে", "৩ নম্বর দিনে কাজ না করলে কী হবে", "তিন নম্বর দিনের কাজ না করলে?",
  "What happens on the 3rd day?", "day-3 tasks", "3য় দিনে কী হবে",
]) {
  test(q, () => assert.equal(parse(q).entities.day?.value, 3));
}

console.log("\nSame number, different meaning");
test("oxygen 3% -> resource, not day", () => {
  const p = parse("oxygen 3% hole ki hobe?");
  assert.deepEqual(p.entities.resource, { name: "oxygen", value: 3 });
  assert.equal(p.entities.day, undefined);
});
test("3% oxygen (reverse order)", () => {
  assert.deepEqual(parse("what if 3% oxygen left").entities.resource, { name: "oxygen", value: 3 });
});
test("অক্সিজেন ৩% হলে কী হবে", () => {
  assert.deepEqual(parse("অক্সিজেন ৩% হলে কী হবে").entities.resource, { name: "oxygen", value: 3 });
});
test("3 ta objective baki -> remaining objectives", () => {
  const p = parse("3 ta objective baki");
  assert.equal(p.entities.remainingObjectives, 3);
  assert.equal(p.entities.day, undefined);
});
test("৩টি লক্ষ্য বাকি", () => {
  assert.equal(parse("৩টি লক্ষ্য বাকি").entities.remainingObjectives, 3);
});
test("30 days survive korte hobe? -> duration", () => {
  const p = parse("30 days survive korte hobe?");
  assert.equal(p.entities.durationDays, 30);
  assert.equal(p.entities.day, undefined);
  assert.ok(p.intents.includes("duration"));
});
test("30 din = campaign length, not Day 30", () => {
  const p = parse("30 din survive korbo?");
  assert.equal(p.entities.durationDays, 30);
  assert.equal(p.entities.day, undefined);
});
test("3/20 on a 20-day mission -> Day 3 of 20", () => {
  const p = parse("3/20", { mission: "moon", campaignDays: 20 });
  assert.deepEqual(p.entities.dayProgress, { day: 3, of: 20 });
});
test("'at 3%' keeps working (at is not a number)", () => {
  assert.equal(parse("oxygen at 3%").entities.resource.value, 3);
});

console.log("\nLanguage detection");
test("English", () => assert.equal(detectLanguage("What happens if I skip day 3?"), "en"));
test("Banglish", () => assert.equal(detectLanguage("3rd day te task na korle ki hobe?"), "banglish"));
test("Bangla", () => assert.equal(detectLanguage("তৃতীয় দিনে কী হবে?"), "bn"));

console.log("\nAnswers come from mission rules");
test("Day 3 skip uses real task data (EN)", () => {
  const r = handleNovaQuestion("What happens if I skip day 3 tasks?", mars);
  assert.ok(r.answer.includes("Clean the solar panels"));
  assert.ok(r.answer.includes("required objective"));
  assert.ok(r.answer.includes("10%"));
  assert.ok(r.answer.includes("optional"));
  assert.ok(r.answer.includes("5 bonus points"));
  assert.equal(r.prompt, null);
});
test("Banglish skip answer is Banglish", () => {
  const r = handleNovaQuestion("3rd day te task na korle ki hobe?", mars);
  assert.ok(r.answer.includes("Darun proshno"));
  assert.ok(r.answer.includes("Clean the solar panels"));
});
test("Bangla skip answer is Bangla script with Bangla digits", () => {
  const r = handleNovaQuestion("তৃতীয় দিনের কাজ না করলে কী হবে?", mars);
  assert.ok(/দারুণ প্রশ্ন/.test(r.answer));
  assert.ok(r.answer.includes("১০%"));
});
test("No task data -> honest general answer", () => {
  const r = handleNovaQuestion("day 3 task skip korle?", { mission: "mars", day: 3 });
  assert.ok(r.answer.includes("exact rule") || r.answer.includes("thik niyom"));
});
test("Past day is noticed", () => {
  const r = handleNovaQuestion("day 1 task skip korle?", mars);
  assert.ok(r.answer.includes("shesh hoye geche"));
});
test("Day 40 on a 30-day mission", () => {
  const r = handleNovaQuestion("day 40 e ki hobe", mars);
  assert.ok(r.answer.includes("mot 30 din"));
});
test("oxygen 3% explains why", () => {
  const r = handleNovaQuestion("oxygen 3% hole ki hobe?", mars);
  assert.ok(r.answer.includes("jaruri"));
  assert.ok(r.answer.includes("breathe") || r.answer.includes("Shash"));
});
test("power why on Mars mentions dust", () => {
  const r = handleNovaQuestion("power kom keno hoy?", mars);
  assert.ok(/dhulo/i.test(r.answer));
});
test("power why on Moon mentions the long night", () => {
  const r = handleNovaQuestion("why is power low", { mission: "moon", resources: { power: 20 } });
  assert.ok(r.answer.includes("14 Earth days"));
});
test("objectives mismatch is flagged", () => {
  const r = handleNovaQuestion("3 ta objective baki", mars);
  assert.ok(r.answer.includes("tomar mission e 3 ta dekhchi") || r.answer.includes("3 ta objective baki"));
});
test("duration answer", () => {
  const r = handleNovaQuestion("30 days survive korte hobe?", mars);
  assert.ok(r.answer.includes("30 diner"));
});
console.log("\nCampaign detection");
for (const [question, expected, language] of [
  ["How many days is the Moon campaign?", "moon", "en"],
  ["Mars campaign e total koy din survive korte hobe?", "mars", "bl"],
  ["চাঁদের মিশন কত দিন?", "moon", "bn"],
  ["মঙ্গল অভিযানে মোট কত দিন বাঁচতে হবে?", "mars", "bn"],
]) {
  test(question, () => {
    const parsed = parse(question, { mission: "moon", campaignDays: 20 });
    assert.equal(parsed.requestedMission, expected);
    assert.equal(parsed.replyLanguage, language);
    const result = handleNovaQuestion(question, { mission: "moon", campaignDays: 20 });
    assert.ok(result.answer.includes(
      expected === "moon"
        ? (language === "bn" ? "২০" : "20")
        : (language === "bn" ? "৩০" : "30")
    ));
  });
}
test("general Mars science does not override Moon campaign context", () => {
  const result = handleNovaQuestion("What is Mars?", { mission: "moon", campaignDays: 20 });
  assert.equal(result.answer, null);
});
test("explicit Mars campaign question overrides active Moon context", () => {
  const result = handleNovaQuestion("How many days is the Mars campaign?", { mission: "moon", campaignDays: 20 });
  assert.ok(result.answer.includes("30"));
});
test("score digit zero uses the verified success rule", () => {
  const result = handleNovaQuestion("amar score 0 hole ki ami win korbo?", mars);
  assert.ok(result.answer.includes("positive"));
});
test("survival suit oxygen remains separate and unknown consequences stay honest", () => {
  const result = handleNovaQuestion("If my suit oxygen reaches zero, what happens next?", mars);
  assert.match(result.answer, /different from the mission oxygen|safe-zone/i);
});
test("prefix [Current mission: Moon] is understood and stripped", () => {
  const r = handleNovaQuestion("[Current mission: Moon] koto din survive korte hobe?", {});
  assert.ok(r.answer.includes("20 diner"));
});
test("open question falls through to the model with facts", () => {
  const r = handleNovaQuestion("Tell me a fun fact about Mars", mars);
  assert.equal(r.answer, null);
  assert.ok(r.prompt.user.includes("Day: 3 of 30"));
  assert.ok(r.prompt.user.includes("power 22%"));
  assert.ok(r.prompt.system.includes("English"));
});

console.log("\nHints");
test("low resource hint comes first, with why", () => {
  const h = buildHint(mars, "en");
  assert.equal(h.key, "resource:power:low");
  assert.ok(h.text.includes("Why?"));
  assert.ok(h.text.includes("dust"));
});
test("hint is not repeated for the same situation", () => {
  assert.equal(hintTrigger(mars, "resource:power:low", "en"), null);
  assert.ok(hintTrigger(mars, "something-else", "en"));
});
test("hint falls back to today's required task", () => {
  const h = buildHint({ ...mars, resources: { power: 80, water: 80, food: 80, oxygen: 80 } }, "bl");
  assert.equal(h.key, "task:solar");
  assert.ok(h.text.includes("Dhulo panel"));
});

console.log("\nServer helpers and false-positive guards");
test("general space questions are not hijacked", () => {
  for (const q of ["how does the moon form?", "what is the moon", "Tell me a fun fact about Mars", "how do rockets work"]) {
    assert.equal(handleNovaQuestion(q, mars).answer, null, q);
  }
});
test("real-world travel time is not the campaign length", () => {
  for (const q of ["how many days to travel to mars?", "mars e jete koto din lage?", "NASA mission koto din"]) {
    assert.equal(handleNovaQuestion(q, mars).answer, null, q);
  }
});
test("day question without task data goes to the model", () => {
  const r = handleNovaQuestion("what happens on day 5?", { mission: "mars", day: 3 });
  assert.equal(r.answer, null);
  assert.ok(r.prompt.user.includes("Mission Day 5"));
});
test("contextFromClientState cleans untrusted input", () => {
  const ctx = contextFromClientState({
    mission: "Mars", day: 999999, score: "abc",
    resources: { power: 150, water: -5, food: "x", oxygen: 40, evil: 1 },
    objectives: { total: 5, done: 2 },
    tasks: [
      { id: "a", day: 3, title: "Fix\nsolar <b>panel</b>", required: 1, affects: "power", penalty: 500 },
      { id: "b", day: 3, title: "", required: true },
      { day: "x", title: "no day" },
    ],
  }, "moon");
  assert.equal(ctx.mission, "mars");
  assert.equal(ctx.day, 365);
  assert.equal(ctx.score, undefined);
  assert.deepEqual(ctx.resources, { power: 100, water: 0, oxygen: 40 });
  assert.equal(ctx.tasks.length, 1);
  assert.equal(ctx.tasks[0].penalty, 100);
  assert.ok(!ctx.tasks[0].title.includes("\n"));
  assert.equal(contextFromClientState(null, "moon").mission, "moon");
  assert.equal(contextFromClientState("junk", "").mission, null);
});
test("novaAddendum carries language, style and facts", () => {
  const a = novaAddendum("[Current mission: Mars] 3rd day te ki hobe?", mars);
  assert.ok(a.includes("Banglish"));
  assert.ok(a.includes("children aged 8 to 14"));
  assert.ok(a.includes("Day: 3 of 30"));
  assert.ok(a.includes("Mission Day 3"));
  assert.ok(!a.includes("Player question"));
});

console.log(`\n${passed} passed`);