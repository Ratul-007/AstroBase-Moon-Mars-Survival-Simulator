import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

const ROCKS = [
  [-5, 0.2, -3, 0.65],
  [-4, 0.15, 3, 0.4],
  [5, 0.2, -3, 0.7],
  [4.5, 0.2, 3.5, 0.5],
  [-2, 0.15, -5, 0.35],
  [3, 0.15, -5, 0.45],
  [6, 0.15, 0, 0.35],
  [-6, 0.15, 0, 0.4],
];

function Terrain({ mars }) {
  const groundColor = mars ? "#8e4633" : "#777d86";
  const rockColor = mars ? "#60352b" : "#484e58";

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.12, 0]}
        receiveShadow
      >
        <planeGeometry args={[32, 32]} />
        <meshStandardMaterial color={groundColor} roughness={1} />
      </mesh>

      {ROCKS.map(([x, y, z, scale], index) => (
        <mesh
          key={index}
          position={[x, y, z]}
          scale={[scale * 1.3, scale * 0.65, scale]}
          rotation={[0.2 * index, 0.4 * index, 0.1]}
          castShadow
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={rockColor} roughness={1} />
        </mesh>
      ))}

      {[
        [-3.5, 2.8, 0.8],
        [3.5, -2.5, 1.1],
        [0.5, 4, 0.6],
      ].map(([x, z, scale], index) => (
        <mesh
          key={`crater-${index}`}
          position={[x, -0.105, z]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[scale * 1.5, scale, 1]}
        >
          <circleGeometry args={[1, 24]} />
          <meshStandardMaterial
            color={mars ? "#71392d" : "#5c626b"}
            roughness={1}
          />
        </mesh>
      ))}
    </group>
  );
}

function Habitat() {
  return (
    <group>
      <mesh position={[0, 0.65, 0]} castShadow>
        <cylinderGeometry args={[1.05, 1.2, 1.3, 12]} />
        <meshStandardMaterial
          color="#d5dbe5"
          metalness={0.25}
          roughness={0.65}
        />
      </mesh>

      <mesh position={[0, 1.45, 0]} castShadow>
        <sphereGeometry
          args={[0.85, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshStandardMaterial
          color="#91b8c9"
          metalness={0.15}
          roughness={0.4}
        />
      </mesh>

      <mesh position={[0, 0.45, 1.16]}>
        <boxGeometry args={[0.42, 0.75, 0.12]} />
        <meshStandardMaterial color="#273746" />
      </mesh>

      <mesh position={[0.48, 0.9, 0.99]}>
        <boxGeometry args={[0.3, 0.27, 0.08]} />
        <meshStandardMaterial
          color="#64d9ff"
          emissive="#123849"
        />
      </mesh>

      <mesh position={[-1.35, 0.4, 0]}>
        <cylinderGeometry args={[0.35, 0.4, 0.8, 10]} />
        <meshStandardMaterial color="#aeb9c7" />
      </mesh>

      <mesh position={[1.35, 0.4, 0]}>
        <cylinderGeometry args={[0.35, 0.4, 0.8, 10]} />
        <meshStandardMaterial color="#aeb9c7" />
      </mesh>
    </group>
  );
}

function SolarArray({ position }) {
  return (
    <group position={position} rotation={[0, 0.15, 0]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.09, 1.1, 0.09]} />
        <meshStandardMaterial color="#b7c2cf" />
      </mesh>

      {[-0.65, 0.65].map((x) => (
        <group key={x} position={[x, 1, 0]}>
          <mesh rotation={[0, 0, -0.08]} castShadow>
            <boxGeometry args={[1.1, 0.07, 1.5]} />
            <meshStandardMaterial color="#aeb9c7" />
          </mesh>

          <mesh position={[0, 0.055, 0]}>
            <boxGeometry args={[1, 0.035, 1.38]} />
            <meshStandardMaterial
              color="#153e79"
              metalness={0.45}
              roughness={0.35}
            />
          </mesh>

          {[-0.25, 0, 0.25].map((z) => (
            <mesh key={z} position={[0, 0.078, z]}>
              <boxGeometry args={[1, 0.012, 0.018]} />
              <meshStandardMaterial color="#72c9ff" />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

function Rover() {
  return (
    <group position={[2.6, 0.35, 1.8]} rotation={[0, -0.4, 0]}>
      <mesh castShadow position={[0, 0.25, 0]}>
        <boxGeometry args={[1.2, 0.35, 0.8]} />
        <meshStandardMaterial color="#d6a74f" metalness={0.25} />
      </mesh>

      <mesh position={[0, 0.52, 0]}>
        <boxGeometry args={[0.5, 0.3, 0.45]} />
        <meshStandardMaterial color="#c9d4df" />
      </mesh>

      {[-0.43, 0.43].flatMap((x) =>
        [-0.3, 0.3].map((z) => (
          <mesh
            key={`${x}-${z}`}
            position={[x, -0.02, z]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.19, 0.19, 0.13, 12]} />
            <meshStandardMaterial color="#252c35" roughness={1} />
          </mesh>
        ))
      )}

      <mesh position={[-0.85, 0.42, 0]}>
        <boxGeometry args={[0.65, 0.05, 0.5]} />
        <meshStandardMaterial color="#174c8b" />
      </mesh>
    </group>
  );
}

function CommunicationAntenna() {
  return (
    <group position={[0, 0, -2.2]}>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.035, 0.06, 1.6, 8]} />
        <meshStandardMaterial color="#c7d0d9" />
      </mesh>

      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.16, 12, 8]} />
        <meshStandardMaterial color="#e6edf5" metalness={0.35} />
      </mesh>

      <mesh position={[0, 1.55, 0.12]} rotation={[0.4, 0, 0]}>
        <torusGeometry args={[0.18, 0.025, 6, 16]} />
        <meshStandardMaterial color="#b8c8d9" />
      </mesh>
    </group>
  );
}

function Outpost({ mars }) {
  return (
    <>
      <Terrain mars={mars} />
      <Habitat />
      <SolarArray position={[-2.7, 0, -0.8]} />
      <SolarArray position={[-2.7, 0, 1.5]} />
      <Rover />
      <CommunicationAntenna />
    </>
  );
}

export default function MissionScene({ planet = "moon" }) {
  const mars = planet === "mars";
  const sceneName = mars ? "Mars Outpost" : "Lunar Outpost";
  const sceneColor = mars ? "#8b4b38" : "#172131";

  const panelStyle = {
    position: "absolute",
    zIndex: 2,
    color: "#f4f7fb",
    background: "rgba(8, 15, 30, 0.84)",
    border: "1px solid rgba(130, 180, 220, 0.3)",
    borderRadius: 12,
    padding: 12,
    fontFamily: "system-ui, sans-serif",
    backdropFilter: "blur(8px)",
  };

  return (
    <section
      aria-label={`${sceneName} 3D environment`}
      style={{
        position: "relative",
        width: "100%",
        height: "clamp(360px, 58vh, 600px)",
        minHeight: 360,
        overflow: "hidden",
        borderRadius: 16,
        background: sceneColor,
        border: "1px solid rgba(120, 160, 200, 0.25)",
      }}
    >
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{
          position: [8, 7, 10],
          fov: 42,
          near: 0.1,
          far: 100,
        }}
        gl={{ antialias: true, powerPreference: "default" }}
        fallback={
          <div style={{ padding: 24, color: "white" }}>
            Your browser could not start the 3D scene.
          </div>
        }
      >
        <color attach="background" args={[sceneColor]} />
        <fog attach="fog" args={[sceneColor, 18, 36]} />

        <ambientLight intensity={mars ? 1.25 : 1} />

        <directionalLight
          position={[6, 10, 5]}
          intensity={mars ? 2 : 2.5}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        <hemisphereLight args={["#a9c7ff", "#51463c", 0.6]} />

        <Outpost mars={mars} />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
          minDistance={5}
          maxDistance={17}
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI / 2.05}
          target={[0, 0.5, 0]}
        />
      </Canvas>

      <div
        style={{
          ...panelStyle,
          top: 12,
          left: 12,
          right: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 2,
              color: "#8fcfff",
              fontWeight: 700,
            }}
          >
            ASTROBASE // 3D ENVIRONMENT
          </div>

          <div style={{ fontSize: 19, fontWeight: 800, marginTop: 4 }}>
            {sceneName}
          </div>
        </div>

        <span
          style={{
            border: "1px solid #47617c",
            borderRadius: 20,
            padding: "7px 11px",
            fontSize: 12,
          }}
        >
          {mars ? "MARS SURFACE" : "LUNAR SURFACE"}
        </span>
      </div>

      <div
        style={{
          ...panelStyle,
          left: 12,
          bottom: 12,
          fontSize: 12,
          lineHeight: 1.6,
          maxWidth: "calc(100% - 48px)",
        }}
      >
        <strong>MISSION ENVIRONMENT</strong>
        <div>Drag to rotate · Scroll or pinch to zoom</div>
        <div style={{ color: "#9fb4c9" }}>
          3D visual prototype · Gameplay integration comes next
        </div>
      </div>
    </section>
  );
}