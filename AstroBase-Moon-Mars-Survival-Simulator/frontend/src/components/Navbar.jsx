import { useState } from "react";
import { Link } from "react-router-dom";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <nav className="navbar" aria-label="Main navigation">
        <Link to="/" className="logo" onClick={closeMenu}>
          <span className="logo-mark" aria-hidden="true">
            ✦
          </span>

          <span className="logo-copy">
            <strong>ASTROBASE</strong>
            <small>JUNIOR ASTRONAUT PROGRAM</small>
          </span>
        </Link>

        <button
          className="mobile-menu-toggle"
          type="button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>

        <div className={`nav-links${menuOpen ? " nav-links-open" : ""}`}>
          <a href="#missions" onClick={closeMenu}>
            MISSIONS
          </a>

          <a href="#how-it-works" onClick={closeMenu}>
            HOW IT WORKS
          </a>

          <a href="#about" onClick={closeMenu}>
            ABOUT
          </a>

          <Link to="/live-proof" onClick={closeMenu}>
            LIVE PROOF
          </Link>

          <Link
            to="/missions"
            className="nav-launch-btn"
            onClick={closeMenu}
          >
            <span>Launch simulator</span>
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;