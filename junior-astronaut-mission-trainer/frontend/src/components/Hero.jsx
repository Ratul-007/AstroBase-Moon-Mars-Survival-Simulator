import { useNavigate } from "react-router-dom";

function Hero() {
  const navigate = useNavigate();

  return (
    <section className="hero">
      <p className="eyebrow">
        NASA SPACE APPS CHALLENGE 2026
      </p>

      <h1>
        Junior Astronaut
        <span>Mission Trainer</span>
      </h1>

      <p className="hero-text">
        Train like an astronaut. Manage your mission. Make critical
        decisions. Explore the challenges of life beyond Earth.
      </p>

      <div className="hero-buttons">
        <button
          type="button"
          className="primary-btn"
          onClick={() => navigate("/missions")}
        >
          Start Mission
        </button>

        <a
          href="#how-it-works"
          className="secondary-btn"
        >
          Learn More
        </a>
      </div>

      <div className="hero-stats">
        <div className="stat">
          <strong>3</strong>
          <span>Mission Environments</span>
        </div>

        <div className="stat">
          <strong>5</strong>
          <span>Core Resources</span>
        </div>

        <div className="stat">
          <strong>10+</strong>
          <span>Mission Events</span>
        </div>
      </div>
    </section>
  );
}

export default Hero;