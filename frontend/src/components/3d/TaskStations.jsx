import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";

/*
 * Visuals for field-task stations.
 *
 *  - TaskStationMarker : 3D object + light beam (rendered inside <Canvas>)
 *  - ObjectiveGuide    : HTML compass showing distance and direction
 *
 * Red-zone stations glow orange, safe-zone stations glow blue.
 */

const KIND_SHAPE = {
  solar_field: "solar",
  ice_extractor: "drill",
  oxygen_gen: "tanks",
  greenhouse: "greenhouse",
  repair_bay: "module",
  instrument: "mast",
  shelter: "dome",
  exposed_equipment: "mast",
  medical: "module",
  sample: "rock",
  lab: "module",
  supply_drop: "pod",
};

function StationBody({ shape }) {
  const metal = { color: "#9fb0c2", metalness: 0.55, roughness: 0.5 };

  switch (shape) {
    case "solar":
      return (
        <group>
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.09, 1.2, 10]} />
            <meshStandardMaterial {...metal} />
          </mesh>
          {[-0.7, 0.7].map((x) => (
            <mesh
              key={x}
              position={[x, 1.15, 0]}
              rotation={[0, 0, -0.15 * Math.sign(x)]}
              castShadow
            >
              <boxGeometry args={[1.2, 0.06, 1.6]} />
              <meshStandardMaterial
                color="#153e79"
                metalness={0.45}
                roughness={0.35}
                emissive="#0b2447"
                emissiveIntensity={0.4}
              />
            </mesh>
          ))}
        </group>
      );

    case "drill":
      return (
        <group>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[1.1, 0.8, 1.1]} />
            <meshStandardMaterial {...metal} />
          </mesh>
          <mesh position={[0, 1.7, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 2.2, 10]} />
            <meshStandardMaterial color="#d6dee8" metalness={0.6} />
          </mesh>
        </group>
      );

    case "tanks":
      return (
        <group>
          {[-0.45, 0.45].map((x) => (
            <mesh key={x} position={[x, 0.75, 0]} castShadow>
              <cylinderGeometry args={[0.35, 0.35, 1.5, 18]} />
              <meshStandardMaterial
                color="#8fd0ff"
                metalness={0.4}
                roughness={0.4}
              />
            </mesh>
          ))}
          <mesh position={[0, 0.2, 0.55]} castShadow>
            <boxGeometry args={[1.4, 0.4, 0.5]} />
            <meshStandardMaterial {...metal} />
          </mesh>
        </group>
      );

    case "greenhouse":
      return (
        <group>
          <mesh position={[0, 0.25, 0]} receiveShadow>
            <cylinderGeometry args={[1.2, 1.2, 0.5, 24]} />
            <meshStandardMaterial {...metal} />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <sphereGeometry args={[1.15, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color="#78d99a"
              transparent
              opacity={0.55}
              roughness={0.2}
            />
          </mesh>
        </group>
      );

    case "dome":
      return (
        <group>
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[1.1, 1.1, 1.2, 24]} />
            <meshStandardMaterial {...metal} />
          </mesh>
          <mesh position={[0, 1.2, 0]} castShadow>
            <sphereGeometry args={[1.1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color="#c49bff"
              metalness={0.3}
              roughness={0.35}
            />
          </mesh>
        </group>
      );

    case "mast":
      return (
        <group>
          <mesh position={[0, 0.9, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.08, 1.8, 10]} />
            <meshStandardMaterial color="#d5dde6" metalness={0.6} />
          </mesh>
          <mesh position={[0, 1.85, 0]} castShadow>
            <boxGeometry args={[0.5, 0.3, 0.3]} />
            <meshStandardMaterial
              color="#fbbf24"
              emissive="#8a5b0a"
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>
      );

    case "rock":
      return (
        <group>
          {[
            [0, 0.3, 0, 0.55],
            [0.6, 0.2, 0.3, 0.35],
            [-0.5, 0.18, -0.3, 0.3],
          ].map(([x, y, z, size], index) => (
            <mesh key={index} position={[x, y, z]} castShadow>
              <dodecahedronGeometry args={[size, 0]} />
              <meshStandardMaterial
                color="#c9b27a"
                emissive="#7a5d12"
                emissiveIntensity={0.55}
                roughness={0.8}
              />
            </mesh>
          ))}
        </group>
      );

    case "pod":
      return (
        <group>
          <mesh position={[0, 0.55, 0]} castShadow>
            <capsuleGeometry args={[0.45, 0.6, 6, 14]} />
            <meshStandardMaterial
              color="#e0a94d"
              metalness={0.4}
              roughness={0.5}
            />
          </mesh>
        </group>
      );

    default:
      return (
        <group>
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[1.5, 1.2, 1.2]} />
            <meshStandardMaterial {...metal} />
          </mesh>
          <mesh position={[0, 1.35, 0]} castShadow>
            <boxGeometry args={[0.6, 0.3, 0.6]} />
            <meshStandardMaterial color="#d8e2ec" metalness={0.4} />
          </mesh>
        </group>
      );
  }
}

export function TaskStationMarker({ step }) {
  const beamMaterial = useRef();
  const ringMaterial = useRef();

  useFrame(({ clock }) => {
    const pulse = Math.sin(clock.elapsedTime * 2.2);

    if (beamMaterial.current) {
      beamMaterial.current.opacity = 0.2 + 0.08 * pulse;
    }

    if (ringMaterial.current) {
      ringMaterial.current.opacity = 0.75 + 0.2 * pulse;
    }
  });

  if (!step?.position) return null;

  const red = step.zone === "red";
  const color = red ? "#fb923c" : "#38bdf8";
  const shape = KIND_SHAPE[step.kind] ?? "module";
  const beamHeight = red ? 34 : 14;

  return (
    <group position={[step.position.x, 0, step.position.z]}>
      {/* Existing outpost objects already have a model: beacon only. */}
      {!step.existing && (
        <>
          <mesh position={[0, 0.06, 0]} receiveShadow>
            <cylinderGeometry args={[1.7, 1.8, 0.12, 32]} />
            <meshStandardMaterial
              color="#38424f"
              metalness={0.4}
              roughness={0.7}
            />
          </mesh>
          <StationBody shape={shape} />
        </>
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.14, 0]}>
        <ringGeometry args={[2.2, 2.45, 48]} />
        <meshBasicMaterial
          ref={ringMaterial}
          color={color}
          transparent
          opacity={0.8}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      <mesh position={[0, beamHeight / 2, 0]}>
        <cylinderGeometry args={[0.18, 0.5, beamHeight, 16, 1, true]} />
        <meshBasicMaterial
          ref={beamMaterial}
          color={color}
          transparent
          opacity={0.22}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      <pointLight
        position={[0, 2.2, 0]}
        color={color}
        intensity={1.1}
        distance={9}
      />
    </group>
  );
}

/*
 * HTML objective chip: current step, distance and direction.
 * The camera always looks toward -Z, so screen-up is -Z and screen-right is +X.
 */
export function ObjectiveGuide({ taskInfo, playerPosRef }) {
  const [guide, setGuide] = useState(null);
  const step = taskInfo?.step ?? null;

  useEffect(() => {
    if (!step?.position) {
      setGuide(null);
      return undefined;
    }

    const update = () => {
      const player = playerPosRef?.current;
      if (!player) return;

      const dx = step.position.x - player.x;
      const dz = step.position.z - player.z;

      setGuide({
        distance: Math.round(Math.hypot(dx, dz)),
        angle: (Math.atan2(dx, -dz) * 180) / Math.PI,
      });
    };

    update();
    const timer = setInterval(update, 150);

    return () => clearInterval(timer);
  }, [step, playerPosRef]);

  if (!step) return null;

  const red = step.zone === "red";

  return (
    <div
      className="scene-objective"
      role="status"
      style={{
        position: "absolute",
        zIndex: 9,
        left: "50%",
        bottom: 165,
        transform: "translateX(-50%)",
        width: "max-content",
        maxWidth: "calc(100% - 24px)",
        boxSizing: "border-box",
        padding: "10px 14px",
        borderRadius: 12,
        border: `1px solid ${red ? "rgba(251,146,60,0.7)" : "rgba(125,211,252,0.6)"}`,
        background: "rgba(5, 12, 25, 0.92)",
        color: "#f8fafc",
        fontFamily: "Arial, sans-serif",
        boxShadow: "0 8px 28px rgba(0, 0, 0, 0.4)",
        pointerEvents: "none",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: 1.5,
          color: red ? "#fdba74" : "#7dd3fc",
        }}
      >
        FIELD TASK · STEP {taskInfo.index + 1}/{taskInfo.count}
      </div>

      <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700 }}>
        {step.action}
      </div>

      {guide && (
        <div
          style={{
            marginTop: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            fontSize: 12,
            color: "#cbd5e1",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              transform: `rotate(${guide.angle}deg)`,
              color: red ? "#fb923c" : "#38bdf8",
              fontSize: 16,
            }}
          >
            ▲
          </span>
          <span>{guide.distance} m</span>
          <span
            style={{
              padding: "2px 7px",
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 700,
              color: red ? "#fecaca" : "#bae6fd",
              background: red ? "rgba(127,29,29,0.6)" : "rgba(7,89,133,0.6)",
            }}
          >
            {red ? "RED ZONE" : "SAFE ZONE"}
          </span>
        </div>
      )}
    </div>
  );
}