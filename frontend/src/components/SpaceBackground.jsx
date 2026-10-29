import "./SpaceBackground.css";

export default function SpaceBackground({
  children,
  fixed = false,
  className = "",
}) {
  const base = import.meta.env.BASE_URL;

  const layers = (
    <>
      <div className="space-bg__stars" aria-hidden="true" />

      <img
        className="space-bg__planet space-bg__earth"
        src={`${base}images/earth.jpg`}
        alt=""
        aria-hidden="true"
      />

      <img
        className="space-bg__planet space-bg__jupiter"
        src={`${base}images/jupiter.jpg`}
        alt=""
        aria-hidden="true"
      />

      <img
        className="space-bg__planet space-bg__saturn"
        src={`${base}images/saturn.jpg`}
        alt=""
        aria-hidden="true"
      />
    </>
  );

  if (fixed) {
    return (
      <div
        className={`space-bg space-bg--fixed ${className}`.trim()}
        aria-hidden="true"
      >
        {layers}
      </div>
    );
  }

  return (
    <div className={`space-bg ${className}`.trim()}>
      {layers}
      <div className="space-bg__content">{children}</div>
    </div>
  );
}