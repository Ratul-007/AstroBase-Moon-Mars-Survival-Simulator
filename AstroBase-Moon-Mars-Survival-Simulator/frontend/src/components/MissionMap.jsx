import { useEffect, useRef, useState } from "react";

/*
 * Round mission map (HTML canvas).
 *
 * North-up, centered on the astronaut.
 * Blue disc = safe zone.
 * Red tint = surrounding mission area.
 * Orange / cyan marker = current task station.
 * Border and caption reflect the astronaut's actual zone status.
 */

const MAP_RANGE = 75;

function getInitialSize() {
  if (typeof window === "undefined") return 150;
  return window.innerWidth <= 620 ? 108 : 150;
}

function MissionMap({
  playerPosRef,
  survivalRef,
  taskInfo = null,
  targets = [],
  safeZone = { center: { x: 0, z: 0 }, radius: 24 },
  worldRadius = 120,
}) {
  const canvasRef = useRef(null);
  const lastPosRef = useRef({ x: 0, z: 3 });
  const headingRef = useRef(Math.PI / 2);

  const [size, setSize] = useState(getInitialSize);
  const [caption, setCaption] = useState(null);

  const step = taskInfo?.step ?? null;

  useEffect(() => {
    const onResize = () => setSize(getInitialSize());

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    let frame;

    const draw = (time) => {
      const canvas = canvasRef.current;

      if (canvas) {
        const ctx = canvas.getContext("2d");

        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          const pixels = Math.round(size * dpr);

          if (canvas.width !== pixels || canvas.height !== pixels) {
            canvas.width = pixels;
            canvas.height = pixels;
          }

          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, size, size);

          const c = size / 2;
          const scale = (c - 5) / MAP_RANGE;

          const player = playerPosRef?.current ?? { x: 0, z: 0 };
          const zone = survivalRef?.current;

          const radius =
            Number.isFinite(zone?.radius) && zone.radius > 0
              ? zone.radius
              : safeZone.radius;

          const center = safeZone.center ?? { x: 0, z: 0 };

          const inZone =
            typeof zone?.inZone === "boolean"
              ? zone.inZone
              : Math.hypot(
                  player.x - center.x,
                  player.z - center.z
                ) <= radius;

          const last = lastPosRef.current;
          const mx = player.x - last.x;
          const mz = player.z - last.z;

          if (Math.hypot(mx, mz) > 0.01) {
            headingRef.current = Math.atan2(mz, mx);
          }

          lastPosRef.current = { x: player.x, z: player.z };

          const toMap = (x, z) => ({
            x: c + (x - player.x) * scale,
            y: c + (z - player.z) * scale,
          });

          ctx.save();

          ctx.beginPath();
          ctx.arc(c, c, c - 1, 0, Math.PI * 2);
          ctx.clip();

          ctx.fillStyle = "#05080f";
          ctx.fillRect(0, 0, size, size);

          const world = toMap(center.x, center.z);

          // Surrounding mission area.
          ctx.beginPath();
          ctx.arc(
            world.x,
            world.y,
            worldRadius * scale,
            0,
            Math.PI * 2
          );

          ctx.fillStyle = "#2a1218";
          ctx.fill();

          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = "rgba(248,113,113,0.55)";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.setLineDash([]);

          // Distance rings.
          ctx.strokeStyle = "rgba(148,163,184,0.18)";

          [25, 50].forEach((meters) => {
            ctx.beginPath();
            ctx.arc(c, c, meters * scale, 0, Math.PI * 2);
            ctx.stroke();
          });

          // Safe zone.
          ctx.beginPath();
          ctx.arc(world.x, world.y, radius * scale, 0, Math.PI * 2);
          ctx.fillStyle = "#0e2a40";
          ctx.fill();

          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Habitat marker.
          ctx.beginPath();
          ctx.arc(world.x, world.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = "#e2e8f0";
          ctx.fill();

          // Permanent interaction targets.
          targets.forEach((target) => {
            if (!target?.position) return;

            const point = toMap(
              target.position.x,
              target.position.z
            );

            ctx.beginPath();
            ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = "#94a3b8";
            ctx.fill();
          });

          // Current task station.
          if (step?.position) {
            const red = step.zone === "red";
            const color = red ? "#fb923c" : "#38bdf8";

            const dx = step.position.x - player.x;
            const dz = step.position.z - player.z;
            const distance = Math.hypot(dx, dz);

            const edge = c - 9;
            const pulse = 0.5 + 0.5 * Math.sin(time / 260);

            const target = toMap(
              step.position.x,
              step.position.z
            );

            const reach = Math.min(distance * scale, edge);
            const ux = distance > 0 ? dx / distance : 0;
            const uz = distance > 0 ? dz / distance : 0;

            // Direction line.
            ctx.setLineDash([3, 4]);
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.65;
            ctx.lineWidth = 1.2;

            ctx.beginPath();
            ctx.moveTo(c, c);
            ctx.lineTo(c + ux * reach, c + uz * reach);
            ctx.stroke();

            ctx.setLineDash([]);
            ctx.globalAlpha = 1;

            if (distance * scale <= edge) {
              const r = 5 + pulse * 2;

              ctx.save();
              ctx.translate(target.x, target.y);
              ctx.rotate(Math.PI / 4);

              ctx.fillStyle = color;
              ctx.fillRect(
                -r / 1.4,
                -r / 1.4,
                r * 1.4,
                r * 1.4
              );

              ctx.restore();
            } else {
              const ex = c + ux * edge;
              const ey = c + uz * edge;
              const angle = Math.atan2(uz, ux);

              ctx.save();
              ctx.translate(ex, ey);
              ctx.rotate(angle);

              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.moveTo(7, 0);
              ctx.lineTo(-5, -5);
              ctx.lineTo(-5, 5);
              ctx.closePath();
              ctx.fill();

              ctx.restore();
            }
          }

          ctx.restore();

          // Astronaut marker.
          ctx.save();
          ctx.translate(c, c);
          ctx.rotate(headingRef.current);

          ctx.fillStyle = "#fde68a";
          ctx.strokeStyle = "#0b1220";
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          ctx.moveTo(7, 0);
          ctx.lineTo(-5, -5);
          ctx.lineTo(-3, 0);
          ctx.lineTo(-5, 5);
          ctx.closePath();

          ctx.fill();
          ctx.stroke();
          ctx.restore();

          // North marker.
          ctx.fillStyle = "rgba(226,232,240,0.85)";
          ctx.font = "bold 10px Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("N", c, 12);

          // Zone status border.
          ctx.beginPath();
          ctx.arc(c, c, c - 1.5, 0, Math.PI * 2);
          ctx.lineWidth = 3;
          ctx.strokeStyle = inZone
            ? "rgba(56,189,248,0.85)"
            : "#ef4444";
          ctx.stroke();
        }
      }

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [
    size,
    step,
    targets,
    safeZone,
    worldRadius,
    playerPosRef,
    survivalRef,
  ]);

  // Station name, distance and current zone.
  useEffect(() => {
    if (!step?.position) {
      setCaption(null);
      return undefined;
    }

    const update = () => {
      const player = playerPosRef?.current;

      if (!player) return;

      const zone = survivalRef?.current;
      const center = safeZone.center ?? { x: 0, z: 0 };

      const radius =
        Number.isFinite(zone?.radius) && zone.radius > 0
          ? zone.radius
          : safeZone.radius;

      const inZone =
        typeof zone?.inZone === "boolean"
          ? zone.inZone
          : Math.hypot(
              player.x - center.x,
              player.z - center.z
            ) <= radius;

      setCaption({
        label: step.label,
        distance: Math.round(
          Math.hypot(
            step.position.x - player.x,
            step.position.z - player.z
          )
        ),
        red: !inZone,
      });
    };

    update();

    const timer = setInterval(update, 200);

    return () => {
      clearInterval(timer);
    };
  }, [step, playerPosRef, survivalRef, safeZone]);

  return (
    <div
      className="scene-map"
      aria-hidden="true"
      style={{
        position: "absolute",
        zIndex: 8,
        top: 128,
        left: 14,
        width: size,
        pointerEvents: "none",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: size,
          height: size,
          borderRadius: "50%",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45)",
        }}
      />

      {caption && (
        <div
          style={{
            marginTop: 6,
            padding: "5px 8px",
            borderRadius: 8,
            background: "rgba(5, 12, 25, 0.88)",
            border: `1px solid ${
              caption.red
                ? "rgba(251,146,60,0.6)"
                : "rgba(125,211,252,0.5)"
            }`,
            color: "#f1f5f9",
            fontSize: 10,
            lineHeight: 1.4,
            textAlign: "center",
          }}
        >
          <div style={{ fontWeight: 700 }}>
            {caption.label}
          </div>

          <div
            style={{
              color: caption.red ? "#fdba74" : "#7dd3fc",
            }}
          >
            {caption.distance} m ·{" "}
            {caption.red ? "RED ZONE" : "SAFE ZONE"}
          </div>
        </div>
      )}
    </div>
  );
}

export default MissionMap;