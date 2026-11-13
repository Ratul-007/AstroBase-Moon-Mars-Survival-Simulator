
import { Link } from "react-router-dom";

function HowItWorks() {
  const steps = [
    {
      number: "01",
      code: "PRE-FLIGHT",
      icon: "⌁",
      title: "Choose your mission",
      description:
        "Select your destination and prepare for the unique challenges of operating beyond Earth.",
      detail: "MISSION PREPARATION",
      button: "Choose Your Mission",
      buttonType: "link",
      buttonTo: "/missions",
      buttonIcon: "↗",
    },
    {
      number: "02",
      code: "SYSTEMS CHECK",
      icon: "◈",
      title: "Manage life support",
      description:
        "Monitor power, water, food and other essential resources. Every supply has a purpose.",
      detail: "RESOURCE MANAGEMENT",
      button: "Explore Life Support",
      buttonType: "scroll",
      buttonTo: "#mission-systems",
      buttonIcon: "↓",
    },
    {
      number: "03",
      code: "MISSION ACTIVE",
      icon: "↗",
      title: "Make the call",
      description:
        "Review Moon and Mars mission briefings, understand the operational risks and prepare for critical survival decisions.",
      detail: "DECISION & SURVIVAL",
      button: "View Mission Briefings",
      buttonType: "link",
      buttonTo: "/mission-briefing",
      buttonIcon: "↗",
    },
  ];

  const handleScroll = (event, target) => {
    event.preventDefault();

    const element = document.querySelector(target);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  return (
    <section className="how-it-works" id="how-it-works">
      <div className="section-topline">
        <span>02 / OPERATIONAL PROTOCOL</span>
        <span>FROM LAUNCH TO SURVIVAL</span>
      </div>

      <div className="section-heading">
        <p className="section-eyebrow">YOUR MISSION PROTOCOL</p>

        <h2>
          Survival is a
          <span> system.</span>
        </h2>

        <p>
          Think like a mission commander. Monitor your systems,
          respond to changing conditions and protect your outpost
          one decision at a time.
        </p>
      </div>

      <div className="steps">
        {steps.map((step) => (
          <article className="step-card" key={step.number}>
            <div className="step-card-top">
              <span className="step-number">{step.number}</span>
              <span className="step-code">{step.code}</span>
            </div>

            <div className="step-icon" aria-hidden="true">
              {step.icon}
            </div>

            <h3>{step.title}</h3>

            <p>{step.description}</p>

            <div className="step-card-bottom">
              <span>{step.detail}</span>
              <span aria-hidden="true">↗</span>
            </div>

            <div className="step-card-action">
              {step.buttonType === "scroll" ? (
                <a
                  href={step.buttonTo}
                  className="protocol-btn"
                  onClick={(event) =>
                    handleScroll(event, step.buttonTo)
                  }
                >
                  <span>{step.button}</span>
                  <span aria-hidden="true">{step.buttonIcon}</span>
                </a>
              ) : (
                <Link
                  to={step.buttonTo}
                  className="protocol-btn"
                >
                  <span>{step.button}</span>
                  <span aria-hidden="true">{step.buttonIcon}</span>
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="systems-strip" id="mission-systems">
        <div className="systems-strip-title">
          <span className="status-dot" />
          <span>MISSION SYSTEMS</span>
        </div>

        <div className="system-chip">
          <span>01</span> POWER
        </div>

        <div className="system-chip">
          <span>02</span> WATER
        </div>

        <div className="system-chip">
          <span>03</span> FOOD
        </div>

        <div className="system-chip">
          <span>04</span> OXYGEN
        </div>

        <div className="system-chip">
          <span>05</span> LIFE SUPPORT
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
