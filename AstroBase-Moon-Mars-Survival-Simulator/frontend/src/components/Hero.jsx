import { useNavigate } from "react-router-dom";
import heroVideo from "../assets/space_apps_2026.mp4";

function Hero() {
  const navigate = useNavigate();

  return (
    <section
      className="hero"
      style={{ position: "relative", overflow: "hidden", isolation: "isolate" }}
    >
      {/* Background video */}
      <video
        src={heroVideo}
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: -2,
        }}
      />

      {/* Dark overlay, jate lekha porte pare */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(5, 10, 30, 0.6)",
          zIndex: -1,
        }}
      />

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