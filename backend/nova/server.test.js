const assert = require("node:assert/strict");
const http = require("node:http");
const net = require("node:net");
const { spawn } = require("node:child_process");
const path = require("node:path");

const serverPath = path.join(__dirname, "server.js");
let port;
let child;

function request(body) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: "127.0.0.1",
      port,
      path: "/api/answer",
      method: "POST",
      headers: { "content-type": "application/json" },
    }, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
    req.end(JSON.stringify(body));
  });
}

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const selectedPort = typeof address === "object" && address
        ? address.port
        : null;
      probe.close((error) => {
        if (error) reject(error);
        else if (selectedPort) resolve(selectedPort);
        else reject(new Error("Could not determine an available test port"));
      });
    });
  });
}

function waitForServer() {
  return new Promise((resolve, reject) => {
    let output = "";
    const onData = (chunk) => {
      output += chunk.toString();
      if (output.includes("Nova is ready at")) {
        child.stdout.off("data", onData);
        resolve();
      }
    };
    child.stdout.on("data", onData);
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      reject(new Error(`Nova server exited before readiness (code=${code}, signal=${signal})`));
    });
  });
}

function stopServer() {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, 2000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
    child.kill();
  });
}

async function run() {
  try {
    port = await findAvailablePort();
    child = spawn(process.execPath, [serverPath], {
      env: { ...process.env, PORT: String(port), NOVA_MODEL: "disabled" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    await waitForServer();
    const duration = await request({
      message: "How many days is the Mars campaign?",
      state: { mission: "Moon", day: 1, resources: { power: 80 } },
    });
    assert.equal(duration.statusCode, 200);
    assert.equal(duration.body.source, "mission-rules");
    assert.match(duration.body.reply, /30/);

    const state = await request({
      message: "What is my current status?",
      state: {
        mission: "Mars",
        day: 3,
        score: 7,
        resources: { power: 12, water: 80, food: 70, oxygen: 90, shielding: 55 },
      },
    });
    assert.equal(state.statusCode, 200);
    assert.equal(state.body.source, "dashboard-live");
    assert.match(state.body.reply, /power 12/i);
    assert.doesNotMatch(state.body.reply, /can't read your live numbers/i);

    const currentState = await request({
      message: "[Current mission: Moon] What is my current state?",
      state: {
        mission: "moon",
        campaignDays: 20,
        day: 2,
        score: 20,
        resources: { power: 81, water: 74, food: 88, oxygen: 92, shielding: 67 },
        objectives: { total: 3, done: 2 },
        missionStatus: "active",
      },
    });
    assert.equal(currentState.statusCode, 200);
    assert.equal(currentState.body.source, "dashboard-live");
    assert.match(currentState.body.reply, /Moon Outpost/i);
    assert.match(currentState.body.reply, /day 2 of 20/i);
    assert.match(currentState.body.reply, /score 20/i);
    assert.match(currentState.body.reply, /power 81/i);
    assert.match(currentState.body.reply, /oxygen 92/i);
    assert.match(currentState.body.reply, /Objectives: 2\/3/i);

    for (const message of [
      "what's my current state?",
      "what's mu current state?",
      "what is my current status?",
      "show my mission status",
    ]) {
      const summary = await request({
        message,
        state: {
          mission: "moon",
          campaignDays: 20,
          day: 2,
          score: 20,
          resources: { power: 81, water: 74, food: 88, oxygen: 92, shielding: 67 },
          objectives: { total: 3, done: 2 },
          missionStatus: "active",
        },
      });
      assert.equal(summary.body.source, "dashboard-live", message);
      assert.match(summary.body.reply, /Moon Outpost|mission status/i, message);
    }

    const power = await request({
      message: "How much power do I have?",
      state: { mission: "moon", resources: { power: 81 } },
    });
    assert.equal(power.body.source, "dashboard-live");
    assert.match(power.body.reply, /Power is at 81%/i);

    const event = await request({
      message: "What event am I facing today?",
      state: {
        mission: "mars",
        day: 4,
        currentEvent: {
          title: "Dust storm",
          description: "Dust is reducing visibility.",
          choices: [{ label: "Shelter", effects: { power: -2 }, score: 4 }],
        },
      },
    });
    assert.equal(event.body.source, "dashboard-live");
    assert.match(event.body.reply, /Dust storm/i);

    const choices = await request({
      message: "What choices do I have?",
      state: {
        mission: "mars",
        currentEvent: {
          title: "Dust storm",
          choices: [{ label: "Shelter", effects: { power: -2 }, score: 4 }],
        },
      },
    });
    assert.equal(choices.body.source, "dashboard-live");
    assert.match(choices.body.reply, /Shelter/i);

    const objectives = await request({
      message: "What are my remaining objectives?",
      state: { mission: "mars", objectives: { total: 5, done: 2 } },
    });
    assert.equal(objectives.body.source, "dashboard-live");
    assert.match(objectives.body.reply, /completed 2 of 5/i);

    const completion = await request({
      message: "How do I complete my current mission?",
      state: {
        mission: "Mars",
        campaignDays: 30,
        objectives: { total: 5, done: 2 },
        resources: { power: 80, water: 70, food: 75, oxygen: 90, shielding: 85 },
      },
    });
    assert.equal(completion.body.source, "dashboard-live");
    assert.match(completion.body.reply, /Mars Outpost \(30 mission days\)/i);
    assert.match(completion.body.reply, /completed 2 of 5/i);
    assert.match(completion.body.reply, /3 remaining/i);
    assert.match(completion.body.reply, /positive score/i);

    const currentTask = await request({
      message: "day 5 e amr ki kaj?",
      state: {
        mission: "Moon",
        day: 5,
        campaignDays: 20,
        currentEvent: {
          id: "moon-05",
          day: 5,
          title: "Solar Array Dust Buildup",
          description: "Dust is reducing solar power.",
          choices: [],
          task: { title: "Service the solar array", steps: [{ action: "Clean the panels" }] },
        },
        taskProgress: { eventId: "moon-05", stepIndex: 0 },
      },
    });
    assert.equal(currentTask.body.source, "dashboard-live");
    assert.match(currentTask.body.reply, /Service the solar array/i);

    const unavailableDay = await request({
      message: "What is the task in day 10?",
      state: {
        mission: "moon",
        day: 2,
        currentEvent: { title: "Current event", choices: [] },
      },
    });
    assert.equal(unavailableDay.body.source, "dashboard-missing");
    assert.match(unavailableDay.body.reply, /day 10/i);

    for (const message of [
      "What will I need to do on the tenth day?",
      "What event happens on day 10?",
      "Tell me about day 10.",
    ]) {
      const currentDayTask = await request({
        message,
        state: {
          mission: "moon",
          day: 10,
          currentEvent: {
            title: "Habitat Seal Inspection",
            description: "A pressure sensor indicates a possible habitat seal problem.",
            choices: [{ label: "Inspect the seal", effects: { power: -1 }, score: 15 }],
            task: {
              title: "Inspect the habitat seal",
              steps: [{ action: "Check the pressure readings" }],
            },
          },
        },
      });
      assert.equal(currentDayTask.body.source, "dashboard-live", message);
      assert.match(currentDayTask.body.reply, /Habitat Seal Inspection/i, message);
      assert.match(currentDayTask.body.reply, /Inspect the habitat seal/i, message);
    }

    const incompleteState = await request({
      message: "What is my current state?",
      state: { mission: "moon", day: 2 },
    });
    assert.equal(incompleteState.body.source, "dashboard-missing");
    assert.match(incompleteState.body.reply, /resource|dashboard/i);

    const marsSuccess = await request({
      message: "How can I complete the Mars mission successfully?",
      state: { mission: "mars", missionStatus: "active" },
    });
    assert.equal(marsSuccess.body.source, "dashboard-live");
    assert.match(marsSuccess.body.reply, /survive 30|positive score|objectives/i);

    const frontendPayloadShape = await request({
      message: "[Current mission: Moon] What happens on the 3rd day?",
      state: {
        mission: "moon",
        campaignDays: 20,
        day: 3,
        score: 12,
        resources: { power: 80, water: 80, food: 80, oxygen: 80, shielding: 80 },
        objectives: { total: 3, done: 1 },
        missionStatus: "active",
        currentEvent: {
          id: "moon-03",
          day: 3,
          title: "Solar Array Dust Buildup",
          description: "Dust is reducing solar power.",
          type: "power",
          severity: "warning",
          choices: [],
          task: {
            title: "Service the solar array",
            steps: [{ action: "Clean the panels" }],
          },
        },
        taskProgress: { eventId: "moon-03", stepIndex: 0 },
        survival: { oxygen: 80, health: 100, inZone: true, status: "safe" },
      },
    });
    assert.equal(frontendPayloadShape.statusCode, 200);
    assert.equal(frontendPayloadShape.body.source, "mission-rules");
    assert.match(frontendPayloadShape.body.reply, /Day 3 tasks: "Service the solar array"/);

    const banglaFrontendPayloadShape = await request({
      message: "[Current mission: Moon] তৃতীয় দিনে কি হবে",
      state: {
        mission: "moon",
        campaignDays: 20,
        day: 3,
        resources: { power: 80, water: 80, food: 80, oxygen: 80, shielding: 80 },
        currentEvent: {
          id: "moon-03",
          day: 3,
          title: "Solar Array Dust Buildup",
          task: {
            title: "Service the solar array",
            steps: [{ action: "Clean the panels" }],
          },
        },
      },
    });
    assert.equal(banglaFrontendPayloadShape.statusCode, 200);
    assert.equal(banglaFrontendPayloadShape.body.source, "mission-rules");
    assert.match(banglaFrontendPayloadShape.body.reply, /৩ নম্বর দিনের কাজ/);

    const advice = await request({
      message: "What should I do if my power is low?",
      state: { mission: "Mars", resources: { power: 12 } },
    });
    assert.equal(advice.statusCode, 200);
    assert.equal(advice.body.source, "mission-rules");
    assert.doesNotMatch(advice.body.reply, /can't read your live numbers/i);

    const suitOxygen = await request({
      message: "If my suit oxygen reaches zero, what happens next?",
      state: {
        mission: "Mars",
        resources: { oxygen: 80 },
        survival: { oxygen: 0, health: 100, inZone: false, failed: false, status: "critical" },
      },
    });
    assert.equal(suitOxygen.statusCode, 200);
    assert.equal(suitOxygen.body.source, "dashboard-live");
    assert.doesNotMatch(suitOxygen.body.reply, /can't read your live numbers/i);
    assert.match(suitOxygen.body.reply, /2-second grace period|4 percentage points per second|health drains at 6 points per second/i);
    assert.match(suitOxygen.body.reply, /separate from mission oxygen/i);

    const oxygenStatus = await request({
      message: "What is my current oxygen level?",
      state: {
        mission: "Mars",
        resources: { oxygen: 73 },
        survival: { oxygen: 18, health: 90, inZone: false, failed: false, status: "danger" },
      },
    });
    assert.equal(oxygenStatus.statusCode, 200);
    assert.doesNotMatch(oxygenStatus.body.reply, /can't read your live numbers/i);
    assert.match(oxygenStatus.body.reply, /oxygen/i);
    assert.ok(
      /73/.test(oxygenStatus.body.reply) ||
      /18/.test(oxygenStatus.body.reply) ||
      /unavailable|not sure|check the dashboard/i.test(oxygenStatus.body.reply),
      `Oxygen response did not identify a value or state unavailability: ${oxygenStatus.body.reply}`
    );
    if (/73/.test(oxygenStatus.body.reply)) {
      assert.match(oxygenStatus.body.reply, /mission oxygen|suit oxygen|survival zone/i);
    }
    if (/18/.test(oxygenStatus.body.reply)) {
      assert.doesNotMatch(oxygenStatus.body.reply, /mission oxygen|mission resource/i);
    }

    const marsScience = await request({
      message: "What is Mars?",
      state: {
        mission: "Moon",
        resources: { oxygen: 80 },
      },
    });
    assert.equal(marsScience.statusCode, 200);
    assert.doesNotMatch(marsScience.body.reply, /Mars (?:campaign|outpost) lasts 30|30 mission days/i);
    assert.doesNotMatch(marsScience.body.reply, /can't read your live numbers/i);

    const choiceAdvice = await request({
      message: "Which choice should I take for the current event, and why?",
      state: {
        mission: "Mars",
        day: 3,
        resources: { power: 12, water: 80, food: 70, oxygen: 90, shielding: 55 },
        currentEvent: {
          title: "Power fault",
          choices: [
            { label: "Repair", effects: { power: 8, water: -2 }, score: 15 },
            { label: "Delay", effects: { power: -10 }, score: -12 },
          ],
        },
      },
    });
    assert.equal(choiceAdvice.statusCode, 200);
    assert.equal(choiceAdvice.body.source, "dashboard-live");
    assert.match(choiceAdvice.body.reply, /Repair/);
    assert.match(choiceAdvice.body.reply, /No choice guarantees mission success/i);

    const certificate = await request({
      message: "Mission fail hole ki certificate pabo?",
      state: { mission: "Mars", missionStatus: "failed" },
    });
    assert.equal(certificate.statusCode, 200);
    assert.equal(certificate.body.source, "dashboard-live");
    assert.match(certificate.body.reply, /only after a successful mission/i);
    assert.match(certificate.body.reply, /30-day Mars campaign/i);
    assert.doesNotMatch(certificate.body.reply, /20-day Moon campaign/i);
    assert.match(certificate.body.reply, /critical resource above zero/i);
    assert.match(certificate.body.reply, /all required objectives/i);
    assert.match(certificate.body.reply, /positive score/i);

    const moonRequirements = await request({
      message: "What do I need to get a certificate?",
      state: { mission: "Moon", campaignDays: 20 },
    });
    assert.equal(moonRequirements.body.source, "dashboard-live");
    assert.match(moonRequirements.body.reply, /20-day Moon campaign/i);
    assert.doesNotMatch(moonRequirements.body.reply, /30-day Mars campaign/i);

    const personalUnknown = await request({
      message: "Am I eligible for a certificate now?",
      state: { mission: "Mars", campaignDays: 30 },
    });
    assert.equal(personalUnknown.body.source, "dashboard-live");
    assert.match(personalUnknown.body.reply, /live mission status is unavailable/i);

    console.log("8 server routing tests passed");
  } finally {
    await stopServer();
  }
}

run().catch((error) => {
  console.error(error);
  child.kill();
  process.exitCode = 1;
});
