
import { useNavigate } from "react-router-dom";
import heroVideo from "../assets/space_apps_2026.mp4";

function Hero() {
  const navigate = useNavigate();

  return (
    <section className="hero">
      <video
        className="hero-video"
        src={heroVideo}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />

      <div className="hero-overlay" aria-hidden="true" />

      <div className="hero-content">
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

          <a href="#how-it-works" className="secondary-btn">
            Learn More
          </a>
        </div>

        <div className="hero-stats">
          <div className="stat">
            <strong>2</strong>
            <span>Mission Environments</span>
          </div>

          <div className="stat">
            <strong>5</strong>
            <span>Core Resources</span>
          </div>

          <div className="stat">
            <strong>20+</strong>
            <span>Mission Events</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
