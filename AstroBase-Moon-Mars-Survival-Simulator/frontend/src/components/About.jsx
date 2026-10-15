function About() {
  return (
    <section className="about" id="about">
      <div className="about-content">
        <p className="section-eyebrow">ABOUT THE PROJECT</p>

        <h2>
          Learn. Decide. Explore.
        </h2>

        <p className="about-text">
          Junior Astronaut Mission Trainer is an interactive space
          mission simulation designed to help students understand
          the challenges of managing life beyond Earth.
        </p>

        <p className="about-text">
          Players manage critical resources, respond to unexpected
          mission events, and make decisions that shape the outcome
          of their mission.
        </p>

        <div className="about-highlights">
          <div>
            <strong>NASA-Based</strong>
            <span>Science & mission concepts</span>
          </div>

          <div>
            <strong>Interactive</strong>
            <span>Learn through decisions</span>
          </div>

          <div>
            <strong>Educational</strong>
            <span>Built for young explorers</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default About;