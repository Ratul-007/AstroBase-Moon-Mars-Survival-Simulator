
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

const ROCKS = [
  { position: [-4, 0.12, -2.5], scale: [0.7, 0.35, 0.55] },
  { position: [3.8, 0.12, -2.8], scale: [0.9, 0.4, 0.7] },
  { position: [-3.5, 0.12, 2.5], scale: [0.6, 0.3, 0.7] },
  { position: [4.2, 0.12, 2.4], scale: [0.65, 0.3, 0.5] },
  { position: [0.5, 0.12, -4], scale: [0.8, 0.25, 0.55] },
  { position: [-1.8, 0.12, 3.8], scale: [0.7, 0.3, 0.45] },
];

function Terrain({ mars }) {
  const groundColor = mars ? "#8b4938" : "#777d88";
  const rockColor = mars ? "#b56548" : "#a6abb3";

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[24, 24, 32, 32]} />
        <meshStandardMaterial
          color={groundColor}
          roughness={1}
        />
      </mesh>

      {ROCKS.map((rock, index) => (
        <mesh
          key={index}
          position={rock.position}
          scale={rock.scale}
          rotation={[0.1 * index, 0.2 * index, 0.1]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={rockColor}
            roughness={1}
          />
        </mesh>
      ))}

      {[
        [-5, -4, 1.2],
        [5, -1, 0.8],
        [-4, 4, 0.7],
        [4, 4.5, 1],
      ].map(([x, z, radius], index) => (
        <mesh
          key={`crater-${index}`}
          position={[x, 0.025, z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[radius * 0.65, radius, 32]} />
          <meshStandardMaterial
            color={mars ? "#713b30" : "#555c67"}
            roughness={1}
          />
        </mesh>
      ))}
    </group>
  );
}

function Habitat() {
  return (
    <group position={[0, 0, 0]}>
      {/* Main habitat */}
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.15, 1.15, 1.8, 24]} />
        <meshStandardMaterial
          color="#c7d1dc"
          metalness={0.35}
          roughness={0.6}
        />
      </mesh>

      {/* Habitat roof */}
      <mesh position={[0, 2.05, 0]} castShadow>
        <sphereGeometry
          args={[1.12, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshStandardMaterial
          color="#8dc9e8"
          metalness={0.2}
          roughness={0.35}
        />
      </mesh>

      {/* Front entrance */}
      <mesh position={[0, 0.65, 1.16]} castShadow>
        <boxGeometry args={[0.48, 1.15, 0.12]} />
        <meshStandardMaterial color="#263a50" />
      </mesh>

      {/* Entrance frame */}
      <mesh position={[0, 1.25, 1.2]}>
        <boxGeometry args={[0.6, 0.08, 0.15]} />
        <meshStandardMaterial color="#e4edf5" />
      </mesh>

      {/* Window */}
      <mesh position={[0.62, 1.45, 0.99]}>
        <boxGeometry args={[0.36, 0.35, 0.08]} />
        <meshStandardMaterial
          color="#43b9f5"
          metalness={0.3}
          roughness={0.2}
          emissive="#12364d"
        />
      </mesh>

      {/* Side equipment modules */}
      <mesh position={[-1.4, 0.65, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.28, 1.2, 16]} />
        <meshStandardMaterial color="#8795a5" metalness={0.5} />
      </mesh>

      <mesh position={[1.4, 0.65, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.28, 1.2, 16]} />
        <meshStandardMaterial color="#8795a5" metalness={0.5} />
      </mesh>

      {/* Support base */}
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <cylinderGeometry args={[1.35, 1.4, 0.2, 24]} />
        <meshStandardMaterial color="#526170" metalness={0.4} />
      </mesh>
    </group>
  );
}

function SolarArray({ position }) {
  return (
    <group position={position}>
      {/* Support pole */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 1.1, 10]} />
        <meshStandardMaterial color="#b8c4d0" metalness={0.6} />
      </mesh>

      {[-0.65, 0.65].map((x) => (
        <group key={x} position={[x, 1, 0]}>
          {/* Panel frame */}
          <mesh rotation={[0, 0, -0.08]} castShadow>
            <boxGeometry args={[1.1, 0.07, 1.5]} />
            <meshStandardMaterial color="#aeb9c7" />
          </mesh>

          {/* Blue solar surface */}
          <mesh position={[0, 0.055, 0]}>
            <boxGeometry args={[1, 0.035, 1.38]} />
            <meshStandardMaterial
              color="#153e79"
              metalness={0.45}
              roughness={0.35}
            />
          </mesh>

          {/* Solar cell grid */}
          {[-0.25, 0, 0.25].map((z) => (
            <mesh key={z} position={[0, 0.078, z]}>
              <boxGeometry args={[1, 0.012, 0.018]} />
              <meshStandardMaterial color="#72c9ff" />
            </mesh>
          ))}

          {[-0.25, 0, 0.25].map((xLine) => (
            <mesh key={`v-${xLine}`} position={[xLine, 0.079, 0]}>
              <boxGeometry args={[0.015, 0.012, 1.35]} />
              <meshStandardMaterial color="#72c9ff" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Rover() {
  return (
    <group position={[2.5, 0, 1.6]} rotation={[0, -0.35, 0]}>
      {/* Rover body */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[1.1, 0.38, 0.8]} />
        <meshStandardMaterial
          color="#e0a94d"
          metalness={0.35}
          roughness={0.5}
        />
      </mesh>

      {/* Top instrument */}
      <mesh position={[0, 0.95, -0.05]} castShadow>
        <boxGeometry args={[0.4, 0.2, 0.35]} />
        <meshStandardMaterial color="#d8e2ec" />
      </mesh>

      {/* Rover wheels */}
      {[-1, 1].flatMap((side) =>
        [-1, 1, 0].map((offset, index) => (
          <mesh
            key={`${side}-${index}`}
            position={[
              side * 0.58,
              0.32,
              offset === 0 ? 0 : offset * 0.3,
            ]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.2, 0.2, 0.13, 16]} />
            <meshStandardMaterial color="#252d37" roughness={0.9} />
          </mesh>
        ))
      )}

      {/* Communication mast */}
      <mesh position={[0.25, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.55, 8]} />
        <meshStandardMaterial color="#dbe5ef" />
      </mesh>
    </group>
  );
}

function CommunicationAntenna() {
  return (
    <group position={[-2.5, 0, -1.2]}>
      {/* Mast */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.07, 2.4, 12]} />
        <meshStandardMaterial color="#d5dde6" metalness={0.6} />
      </mesh>

      {/* Dish */}
      <mesh
        position={[0, 2.25, 0]}
        rotation={[Math.PI / 2.8, 0, 0]}
        castShadow
      >
        <torusGeometry args={[0.38, 0.045, 12, 32]} />
        <meshStandardMaterial
          color="#e1e8ef"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Dish center */}
      <mesh position={[0, 2.25, 0.08]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color="#59c7ff" emissive="#123b54" />
      </mesh>

      {/* Base */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.32, 0.24, 12]} />
        <meshStandardMaterial color="#657586" />
      </mesh>
    </group>
  );
}

function Outpost({ mars }) {
  return (
    <group>
      <Terrain mars={mars} />
      <Habitat />

      <SolarArray position={[-2.2, 0, 1.1]} />
      <SolarArray position={[-2.2, 0, 2.7]} />

      <Rover />
      <CommunicationAntenna />
    </group>
  );
}

function MissionScene({ planet = "moon" }) {
  const mars = planet === "mars";
  const skyColor = mars ? "#4b2928" : "#101b30";
  const title = mars ? "MARS OUTPOST" : "LUNAR OUTPOST";

  const panelStyle = {
    position: "absolute",
    zIndex: 2,
    color: "#f1f5f9",
    background: "rgba(5, 12, 25, 0.78)",
    border: "1px solid rgba(125, 211, 252, 0.4)",
    borderRadius: "10px",
    padding: "12px 16px",
    fontFamily: "Arial, sans-serif",
    pointerEvents: "none",
  };

  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        height: "480px",
        overflow: "hidden",
        background: skyColor,
        borderRadius: "10px",
      }}
    >
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{
          position: [8, 7, 10],
          fov: 45,
          near: 0.1,
          far: 100,
        }}
      >
        <color attach="background" args={[skyColor]} />
        <fog attach="fog" args={[skyColor, 18, 38]} />

        <ambientLight intensity={mars ? 1.1 : 0.8} />

        <directionalLight
          position={[8, 12, 6]}
          intensity={mars ? 2.2 : 2.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        <pointLight position={[-4, 5, -4]} intensity={0.6} />

        <Outpost mars={mars} />

        <OrbitControls
          makeDefault
          target={[0, 0.5, 0]}
          enableDamping
          dampingFactor={0.08}
          minDistance={5}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2.05}
        />
      </Canvas>

      {/* Environment label */}
      <div
        style={{
          ...panelStyle,
          top: "14px",
          left: "14px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            letterSpacing: "2px",
            color: "#7dd3fc",
            marginBottom: "5px",
          }}
        >
          ASTROBASE // 3D ENVIRONMENT
        </div>

        <div style={{ fontSize: "18px", fontWeight: 700 }}>
          {title}
        </div>
      </div>

      {/* Controls hint */}
      <div
        style={{
          ...panelStyle,
          bottom: "14px",
          left: "14px",
          fontSize: "12px",
        }}
      >
        Drag to rotate · Scroll or pinch to zoom
      </div>

      {/* Prototype label */}
      <div
        style={{
          ...panelStyle,
          bottom: "14px",
          right: "14px",
          fontSize: "11px",
          color: "#cbd5e1",
        }}
      >
        3D VISUAL PROTOTYPE
      </div>
    </section>
  );
}

export default MissionScene;
