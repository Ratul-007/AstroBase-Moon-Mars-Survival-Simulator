
function About() {
  return (
    <section className="about" id="about">
      <div className="about-visual">
        <div className="about-visual-frame">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="about-earth" />
          <span className="visual-label visual-label-top">
            HUMANITY / BEYOND EARTH
          </span>
          <span className="visual-label visual-label-bottom">
            EXPLORATION IS A TEAM EFFORT
          </span>
          <span className="visual-coordinate">MISSION / 026</span>
        </div>
      </div>

      <div className="about-content">
        <p className="section-eyebrow">ABOUT THE PROJECT</p>

        <h2>
          Built for the
          <span> next generation</span>
          of explorers.
        </h2>

        <p className="about-text">
          AstroBase: Junior Astronaut Mission Trainer is an
          interactive space-survival simulation that introduces
          students to the challenges of supporting life beyond Earth.
        </p>

        <p className="about-text">
          Manage critical resources, respond to unexpected mission
          events and discover how decisions can affect the survival
          of a space outpost.
        </p>

        <div className="about-highlights">
          <div>
            <span className="highlight-index">01 / LEARN</span>
            <strong>Science inspired</strong>
            <span>Explore spaceflight and life-support concepts.</span>
          </div>

          <div>
            <span className="highlight-index">02 / DECIDE</span>
            <strong>Interactive by design</strong>
            <span>Learn by weighing choices and their outcomes.</span>
          </div>

          <div>
            <span className="highlight-index">03 / EXPLORE</span>
            <strong>Made for explorers</strong>
            <span>Build problem-solving skills through simulation.</span>
          </div>
        </div>

        <p className="about-disclaimer">
          An educational simulation. Mission scenarios are simplified
          for learning and are not operational NASA guidance.
        </p>
      </div>
    </section>
  );
}

export default About;
