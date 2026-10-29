
import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-callout">
        <p className="section-eyebrow">YOUR NEXT ADVENTURE AWAITS</p>
        <h2>
          Ready for
          <span> launch?</span>
        </h2>
        <p>
          Your outpost needs a commander. Take the controls and
          see if you have what it takes to survive beyond Earth.
        </p>
        <Link to="/missions" className="footer-launch-btn">
          Enter mission control <span aria-hidden="true">↗</span>
        </Link>
      </div>

      <div className="footer-content">
        <div className="footer-brand">
          <Link to="/" className="logo">
            <span className="logo-mark" aria-hidden="true">✦</span>
            <span className="logo-copy">
              <strong>ASTROBASE</strong>
              <small>JUNIOR ASTRONAUT PROGRAM</small>
            </span>
          </Link>

          <p>
            An interactive mission trainer for the next generation
            of space explorers.
          </p>
        </div>

        <div className="footer-nav-group">
          <span className="footer-nav-heading">EXPLORE</span>
          <div className="footer-links">
            <a href="#missions">Missions</a>
            <a href="#how-it-works">How it works</a>
            <a href="#about">About the project</a>
          </div>
        </div>

        <div className="footer-nav-group">
          <span className="footer-nav-heading">MISSION CONTROL</span>
          <div className="footer-links">
            <Link to="/missions">Launch simulator ↗</Link>
            <Link to="/">Return to base ↑</Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>NASA SPACE APPS CHALLENGE 2026</p>
        <p>BUILT BY TEAM 404: EARTH NOT FOUND 🚀</p>
        <a href="#top" onClick={(event) => {
          event.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}>
          BACK TO TOP ↑
        </a>
      </div>
    </footer>
  );
}

export default Footer;
