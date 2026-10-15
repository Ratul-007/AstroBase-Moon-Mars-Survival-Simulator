function HowItWorks() {
  return (
    <section className="how-it-works" id="how-it-works">
      <div className="section-heading">
        <p className="section-eyebrow">HOW IT WORKS</p>

        <h2>
          Your Mission Starts Here
        </h2>

        <p>
          Complete your mission by managing resources, responding to
          unexpected events, and making smart decisions.
        </p>
      </div>

      <div className="steps">
        <div className="step-card">
          <span className="step-number">01</span>

          <div className="step-icon">🚀</div>

          <h3>Choose Your Mission</h3>

          <p>
            Select a mission environment and prepare your outpost
            for the challenges ahead.
          </p>
        </div>

        <div className="step-card">
          <span className="step-number">02</span>

          <div className="step-icon">🛰️</div>

          <h3>Manage Resources</h3>

          <p>
            Balance power, water, food, life support, and other
            critical mission resources.
          </p>
        </div>

        <div className="step-card">
          <span className="step-number">03</span>

          <div className="step-icon">🌕</div>

          <h3>Make Critical Decisions</h3>

          <p>
            Respond to unexpected events and see how your decisions
            affect the mission.
          </p>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;