import { useEffect, useState } from "react";

function getFpsColor(fps) {
  if (fps >= 55) return "#86efac";
  if (fps >= 30) return "#fde68a";
  return "#fca5a5";
}

export default function FpsButton() {
  const [fps, setFps] = useState(0);
  const [mapSize, setMapSize] = useState(() =>
    typeof window !== "undefined" && window.innerWidth <= 620
      ? 108
      : 150
  );

  useEffect(() => {
    const updateMapSize = () => {
      setMapSize(window.innerWidth <= 620 ? 108 : 150);
    };

    window.addEventListener("resize", updateMapSize);

    let frameId;
    let lastTimestamp = null;
    let elapsed = 0;
    let frameCount = 0;

    const measure = (timestamp) => {
      if (lastTimestamp !== null) {
        elapsed += timestamp - lastTimestamp;
        frameCount += 1;
      }

      lastTimestamp = timestamp;

      if (elapsed >= 500) {
        setFps(Math.round((frameCount * 1000) / elapsed));
        elapsed = 0;
        frameCount = 0;
      }

      frameId = requestAnimationFrame(measure);
    };

    frameId = requestAnimationFrame(measure);

    return () => {
      window.removeEventListener("resize", updateMapSize);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={`Current frame rate: ${fps} FPS`}
      style={{
        position: "absolute",
        zIndex: 30,
        top: 128 + mapSize + 48,
        left: 14,
        padding: "6px 9px",
        border: "1px solid rgba(125, 211, 252, 0.55)",
        borderRadius: 7,
        background: "rgba(5, 12, 25, 0.84)",
        color: getFpsColor(fps),
        fontFamily: "var(--font-body)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
        maxWidth: "calc(100vw - 28px)",
        pointerEvents: "none",
      }}
    >
      {fps} FPS
    </button>
  );
}
