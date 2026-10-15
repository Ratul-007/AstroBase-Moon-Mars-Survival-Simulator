import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// 1. Mission Events Data (6 Unique Events)
const missionEvents = [
  {
    id: 1,
    title: "⚠️ Solar Power Fluctuation",
    description: "A sudden change in solar activity is affecting your outpost's power generation. Choose how you want to respond.",
    options: [
      { label: "Reduce Power Usage", effects: { power: -10, score: 5 }, outcome: { title: "✅ Crisis Averted", text: "You safely reduced power usage. Power dropped slightly, but operations are stable." } },
      { label: "Use Emergency Battery", effects: { power: +10, score: -10 }, outcome: { title: "🔋 Battery Depleted", text: "Emergency batteries used. Power is boosted, but you lost mission score points." } },
      { label: "Continue Normally", effects: { power: -30, lifeSupport: -15, score: -20 }, outcome: { title: "❌ Critical Drain", text: "Ignoring the fluctuation caused a massive power drain and affected life support!" } }
    ]
  },
  {
    id: 2,
    title: "💧 Water Leak Detected",
    description: "Sensors detect a rapid drop in water pressure near the hydroponics bay.",
    options: [
      { label: "Seal the Section", effects: { water: -10, food: -10, score: 5 }, outcome: { title: "🔧 Section Sealed", text: "The leak is contained, but shutting off the section damaged some crops." } },
      { label: "Emergency Repairs", effects: { power: -15, water: +5, score: 10 }, outcome: { title: "🛠️ Repaired", text: "You used extra power for welding drones to permanently fix the pipe." } },
      { label: "Ignore It", effects: { water: -40, score: -30 }, outcome: { title: "❌ Flooding", text: "A huge amount of your water reserve was lost before auto-shutoff kicked in." } }
    ]
  },
  {
    id: 3,
    title: "🍎 Food Freezer Malfunction",
    description: "The primary cooling unit for the food storage is failing.",
    options: [
      { label: "Divert Power to Cooler", effects: { power: -20, food: +5, score: 10 }, outcome: { title: "❄️ Food Saved", text: "Power diverted. The food is safe, but your energy reserves took a hit." } },
      { label: "Consume Perishables", effects: { food: -15, score: -5 }, outcome: { title: "🍽️ Forced Feast", text: "Crew ate what they could, but some food had to be thrown away." } },
      { label: "Wait for Auto-Repair", effects: { food: -35, score: -25 }, outcome: { title: "❌ Spoilage", text: "Auto-repair failed. A large portion of your food supply spoiled." } }
    ]
  },
  {
    id: 4,
    title: "🫁 Oxygen System Warning",
    description: "CO2 scrubbers are operating below optimal capacity. Air quality is dropping.",
    options: [
      { label: "Replace Scrubbers", effects: { lifeSupport: +10, power: -15, score: 15 }, outcome: { title: "🌬️ Air Cleared", text: "New scrubbers installed. Life support is back to optimal levels." } },
      { label: "Vent the Cabin", effects: { lifeSupport: -15, water: -10, score: -5 }, outcome: { title: "💨 Rapid Venting", text: "Venting cleared the CO2 but wasted atmospheric moisture (water)." } },
      { label: "Continue Normally", effects: { lifeSupport: -40, score: -35 }, outcome: { title: "❌ Toxic Air", text: "The crew suffered from hypoxia. Critical damage to life support integrity." } }
    ]
  },
  {
    id: 5,
    title: "☢️ Radiation Spike",
    description: "A cosmic ray burst is approaching the outpost. Radiation levels are rising.",
    options: [
      { label: "Boost Magnetic Shields", effects: { power: -25, radiation: +15, score: 20 }, outcome: { title: "🛡️ Shields Holding", text: "Heavy power usage, but the outpost is perfectly safe from the radiation." } },
      { label: "Lockdown to Core", effects: { food: -10, radiation: -10, score: 5 }, outcome: { title: "🚪 Lockdown", text: "Crew moved to the shielded core. Safe, but hydroponics took radiation damage." } },
      { label: "Do Nothing", effects: { radiation: -50, lifeSupport: -20, score: -40 }, outcome: { title: "❌ Lethal Dose", text: "Severe radiation damage to both the crew and the outpost systems." } }
    ]
  },
  {
    id: 6,
    title: "🔧 Main Computer Glitch",
    description: "The AI managing automated systems is rebooting unexpectedly.",
    options: [
      { label: "Manual Override", effects: { power: -10, lifeSupport: -10, score: 15 }, outcome: { title: "👨‍🚀 Manual Control", text: "Crew successfully managed systems manually until the AI rebooted." } },
      { label: "Hard Reset", effects: { all: -10, score: 0 }, outcome: { title: "🔌 Hard Reset", text: "Systems went offline briefly. All resources suffered a minor drop." } },
      { label: "Wait it out", effects: { score: -20, power: -20 }, outcome: { title: "❌ Chaos", text: "Without AI control, systems ran inefficiently, wasting power." } }
    ]
  }
];

function MissionDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const isMars = location.state?.planet === "mars";
  const planetName = isMars ? "Mars Outpost" : "Moon Outpost";
  const planetIcon = isMars ? "🔴" : "🌕";

  // State Management
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [day, setDay] = useState(1);
  const [score, setScore] = useState(100);
  const [isGameOver, setIsGameOver] = useState(false);
  
  const [resources, setResources] = useState({
    power: 100,
    water: 100,
    food: 100,
    lifeSupport: 100,
    radiation: 100,
  });

  const currentEvent = missionEvents[currentEventIndex];
  const [resolvedEvent, setResolvedEvent] = useState(null); // Stores outcome after decision

  // Handle Button Click for Decision
  const handleDecision = (option) => {
    // 1. Update Resources
    setResources((prev) => {
      const newRes = { ...prev };
      
      if (option.effects.all) {
        newRes.power -= 10; newRes.water -= 10; newRes.food -= 10; newRes.lifeSupport -= 10; newRes.radiation -= 10;
      } else {
        if (option.effects.power) newRes.power += option.effects.power;
        if (option.effects.water) newRes.water += option.effects.water;
        if (option.effects.food) newRes.food += option.effects.food;
        if (option.effects.lifeSupport) newRes.lifeSupport += option.effects.lifeSupport;
        if (option.effects.radiation) newRes.radiation += option.effects.radiation;
      }

      // Ensure resources stay between 0 and 100
      Object.keys(newRes).forEach(key => {
        newRes[key] = Math.max(0, Math.min(100, newRes[key]));
      });

      return newRes;
    });

    // 2. Update Score
    setScore((prev) => prev + (option.effects.score || 0));

    // 3. Set Outcome to show to the user
    setResolvedEvent(option.outcome);
  };

  // Move to the next event or End Game
  const nextEvent = () => {
    // Check if any resource is 0 (Critical Failure)
    const isCriticalFailure = Object.values(resources).some(val => val <= 0);

    if (isCriticalFailure || currentEventIndex + 1 >= missionEvents.length) {
      setIsGameOver(true);
    } else {
      setCurrentEventIndex((prev) => prev + 1);
      setDay((prev) => prev + 3); // Jump a few days for next event
      setResolvedEvent(null);
    }
  };

  // Restart Mission function
  const restartMission = () => {
    setResources({ power: 100, water: 100, food: 100, lifeSupport: 100, radiation: 100 });
    setScore(100);
    setDay(1);
    setCurrentEventIndex(0);
    setResolvedEvent(null);
    setIsGameOver(false);
  };

  // Evaluate final performance
  const evaluatePerformance = () => {
    const isCritical = Object.values(resources).some(val => val <= 0);
    if (isCritical) return "CRITICAL FAILURE - Outpost uninhabitable.";
    if (score >= 120) return "EXCEPTIONAL - A flawless command performance.";
    if (score >= 80) return "SUCCESSFUL - You survived the frontier.";
    return "MARGINAL - The crew survived, but barely.";
  };

  // =========================
  // RENDER: GAME OVER SCREEN
  // =========================
  if (isGameOver) {
    const isCritical = Object.values(resources).some(val => val <= 0);
    
    return (
      <section className="mission-dashboard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="event-panel" style={{ width: '100%', maxWidth: '700px', textAlign: 'center' }}>
          <span className="mission-type">{isCritical ? "MISSION FAILED" : "MISSION COMPLETE"}</span>
          <h2 style={{ fontSize: '2.5rem', margin: '20px 0', color: isCritical ? '#f87171' : '#86efac' }}>
            {isCritical ? "Colony Lost" : "Survival Achieved"}
          </h2>
          
          <p style={{ fontSize: '1.2rem', color: '#9eabc3', marginBottom: '30px' }}>
            {evaluatePerformance()}
          </p>

          <div style={{ background: '#080f21', padding: '20px', borderRadius: '14px', marginBottom: '30px' }}>
            <h3 style={{ color: '#7dd3fc', marginBottom: '15px' }}>Final Score: {score}</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <span>⚡ {resources.power}%</span>
              <span>💧 {resources.water}%</span>
              <span>🍎 {resources.food}%</span>
              <span>🫁 {resources.lifeSupport}%</span>
              <span>☢️ {resources.radiation}%</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="primary-btn" onClick={restartMission} style={{ background: '#7dd3fc', color: '#06101f', padding: '14px 26px', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
              Restart Mission
            </button>
            <button className="secondary-btn" onClick={() => navigate("/missions")} style={{ background: 'transparent', color: '#fff', padding: '14px 26px', border: '1px solid #405070', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
              Back to Missions
            </button>
          </div>
        </div>
      </section>
    );
  }

  // =========================
  // RENDER: MAIN DASHBOARD
  // =========================
  return (
    <section className="mission-dashboard">
      <header className="dashboard-header">
        <div>
          <span className="mission-type">ACTIVE MISSION</span>
          <h1>{planetIcon} {planetName}</h1>
        </div>
        <div className="mission-day">
          <span>MISSION DAY</span>
          <strong>{day < 10 ? `0${day}` : day} / 20</strong>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Resources Panel */}
        <section className="resource-panel">
          <div className="panel-heading">
            <h2>Mission Resources</h2>
            <span>STATUS: {Object.values(resources).some(v => v < 50) ? "CRITICAL" : "STABLE"}</span>
          </div>

          <div className="resource-grid">
            <div className="resource-card">
              <span>⚡ Power</span>
              <strong>{resources.power}%</strong>
              <div className="resource-bar"><div className="resource-fill power" style={{ width: `${resources.power}%` }}></div></div>
            </div>
            <div className="resource-card">
              <span>💧 Water</span>
              <strong>{resources.water}%</strong>
              <div className="resource-bar"><div className="resource-fill water" style={{ width: `${resources.water}%` }}></div></div>
            </div>
            <div className="resource-card">
              <span>🍎 Food</span>
              <strong>{resources.food}%</strong>
              <div className="resource-bar"><div className="resource-fill food" style={{ width: `${resources.food}%` }}></div></div>
            </div>
            <div className="resource-card">
              <span>🫁 Life Support</span>
              <strong>{resources.lifeSupport}%</strong>
              <div className="resource-bar"><div className="resource-fill life-support" style={{ width: `${resources.lifeSupport}%` }}></div></div>
            </div>
            <div className="resource-card">
              <span>☢️ Radiation Shield</span>
              <strong>{resources.radiation}%</strong>
              <div className="resource-bar"><div className="resource-fill radiation" style={{ width: `${resources.radiation}%` }}></div></div>
            </div>
          </div>
        </section>

        {/* Dynamic Event Panel */}
        <section className="event-panel">
          <span className="mission-type">
            {resolvedEvent ? "EVENT RESOLUTION" : `MISSION EVENT ${currentEventIndex + 1} OF ${missionEvents.length}`}
          </span>
          
          <h2>{resolvedEvent ? resolvedEvent.title : currentEvent.title}</h2>
          <p>{resolvedEvent ? resolvedEvent.text : currentEvent.description}</p>

          <div className="decision-options">
            {!resolvedEvent ? (
              // Show Choice Buttons
              currentEvent.options.map((option, idx) => (
                <button 
                  key={idx} 
                  className="decision-btn" 
                  onClick={() => handleDecision(option)}
                >
                  {option.label}
                </button>
              ))
            ) : (
              // Show Next Button after a choice is made
              <button 
                className="decision-btn" 
                onClick={nextEvent}
                style={{ background: '#111d38', borderColor: '#7dd3fc', width: '100%', maxWidth: '300px', margin: '0 auto' }}
              >
                {currentEventIndex + 1 >= missionEvents.length ? "View Final Results →" : "Proceed to Next Event →"}
              </button>
            )}
          </div>
        </section>

        {/* Score Panel */}
        <aside className="score-panel">
          <span>MISSION SCORE</span>
          <strong>{score}</strong>
          <p>Keep your resources stable and make smart decisions.</p>
        </aside>
      </div>

      <button className="back-btn" onClick={() => navigate("/missions")}>
        ← Abort Mission
      </button>
    </section>
  );
}

export default MissionDashboard;