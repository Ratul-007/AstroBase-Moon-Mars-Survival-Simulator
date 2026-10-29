import { memo, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import PlayerController from "./PlayerController";
import { TaskStationMarker, ObjectiveGuide } from "./TaskStations";
import MissionMap from "../MissionMap";

const CHUNK_SIZE = 48;
// Keep nearby terrain detailed without creating hundreds of off-screen
// objects and shadow casters every frame.
const CHUNK_RADIUS = 2;
const CHUNK_SEGMENTS = 12;

const DEFAULT_WORLD_CONFIG = {
  worldRadius: 120,
  safeZoneRadius: 24,
  safeZoneCenter: { x: 0, z: 0 },
};

export const INTERACTION_TARGETS = [
  {
    id: "supply-cache-01",
    type: "supplies",
    label: "Emergency Supply Cache",
    key: "e",
    position: { x: 5.5, z: -3.5 },
    radius: 3,
  },
  {
    id: "solar-array-01",
    type: "solar",
    label: "Solar Array",
    key: "f",
    position: { x: -2.2, z: 1.1 },
    radius: 3,
  },
  {
    id: "rover-check-01",
    type: "rover",
    label: "Exploration Rover",
    key: "r",
    position: { x: 2.5, z: 1.6 },
    radius: 3,
  },
];

const ROCKS = [
  { position: [-4, 0.12, -2.5], scale: [0.7, 0.35, 0.55] },
  { position: [3.8, 0.12, -2.8], scale: [0.9, 0.4, 0.7] },
  { position: [-3.5, 0.12, 2.5], scale: [0.6, 0.3, 0.7] },
  { position: [4.2, 0.12, 2.4], scale: [0.65, 0.3, 0.5] },
  { position: [0.5, 0.12, -4], scale: [0.8, 0.25, 0.55] },
  { position: [-1.8, 0.12, 3.8], scale: [0.7, 0.3, 0.45] },
  { position: [1.5, 0.12, -5.2], scale: [0.5, 0.22, 0.4] },
  { position: [-6, 0.12, 0.5], scale: [0.45, 0.2, 0.6] },
  { position: [6, 0.12, -4.5], scale: [0.55, 0.25, 0.4] },
];

const CRATERS = [
  [-5, -4, 1.2],
  [5, -1, 0.8],
  [-4, 4, 0.7],
  [4, 4.5, 1],
  [6, 1.5, 0.65],
  [-6, -1.5, 0.75],
];

const OUTPOST_OBSTACLES = [
  { type: "circle", x: 0, z: 0, radius: 1.45 },
  { type: "circle", x: -1.4, z: 0, radius: 0.38 },
  { type: "circle", x: 1.4, z: 0, radius: 0.38 },
  { type: "box", x: -2.2, z: 1.1, width: 2.6, depth: 1.5 },
  { type: "box", x: -2.2, z: 2.7, width: 2.6, depth: 1.5 },
  { type: "box", x: 2.5, z: 1.6, width: 1.9, depth: 1.6 },
  { type: "circle", x: -2.5, z: -1.2, radius: 0.4 },
  { type: "circle", x: -4, z: -2.5, radius: 0.55 },
  { type: "circle", x: 3.8, z: -2.8, radius: 0.65 },
  { type: "circle", x: -3.5, z: 2.5, radius: 0.5 },
  { type: "circle", x: 4.2, z: 2.4, radius: 0.5 },
  { type: "circle", x: 0.5, z: -4, radius: 0.5 },
  { type: "circle", x: -1.8, z: 3.8, radius: 0.5 },
  { type: "circle", x: 1.5, z: -5.2, radius: 0.4 },
  { type: "circle", x: -6, z: 0.5, radius: 0.4 },
  { type: "circle", x: 6, z: -4.5, radius: 0.45 },
];

function seededRandom(seed) {
  let value = seed >>> 0;

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function StarField({ mars }) {
  const starPositions = useMemo(() => {
    const positions = [];
    const random = seededRandom(2026);

    for (let i = 0; i < 650; i += 1) {
      const theta = random() * Math.PI * 2;
      const y = random() * 2 - 1;
      const radius = 75 + random() * 20;
      const horizontal = Math.sqrt(1 - y * y);

      positions.push(
        Math.cos(theta) * horizontal * radius,
        y * radius,
        Math.sin(theta) * horizontal * radius
      );
    }

    return new Float32Array(positions);
  }, []);

  return (
    <points frustumCulled={false} renderOrder={-1}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[starPositions, 3]}
        />
      </bufferGeometry>

      <pointsMaterial
        color={mars ? "#ffe2cf" : "#dceaff"}
        size={0.11}
        sizeAttenuation
        transparent
        opacity={0.9}
        depthWrite={false}
        fog={false}
      />
    </points>
  );
}

function TerrainChunk({ cx, cz, mars }) {
  const features = useMemo(() => {
    const random = seededRandom(
      ((cx + 1000) * 73856093) ^
        ((cz + 1000) * 19349663) ^
        (mars ? 0x45a91 : 0x17329)
    );

    const result = [];

    for (let i = 0; i < 10; i += 1) {
      const x = (random() - 0.5) * CHUNK_SIZE;
      const z = (random() - 0.5) * CHUNK_SIZE;
      const worldX = cx * CHUNK_SIZE + x;
      const worldZ = cz * CHUNK_SIZE + z;

      if (Math.hypot(worldX, worldZ) < 20) continue;

      result.push({
        key: `${cx}-${cz}-${i}`,
        x,
        z,
        scale: 0.35 + random() * 1.1,
        rotation: random() * Math.PI * 2,
        crater: random() > 0.58,
      });
    }

    return result;
  }, [cx, cz, mars]);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      CHUNK_SIZE,
      CHUNK_SIZE,
      CHUNK_SEGMENTS,
      CHUNK_SEGMENTS
    );

    geo.rotateX(-Math.PI / 2);

    const position = geo.attributes.position;
    const random = seededRandom(
      ((cx + 100) * 92837111) ^
        ((cz + 100) * 689287499) ^
        (mars ? 193 : 71)
    );

    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const z = position.getZ(i);

      const broad =
        Math.sin((x + cx * 4) * 0.12) *
        Math.cos((z + cz * 3) * 0.1);

      const fine = (random() - 0.5) * (mars ? 0.12 : 0.08);

      position.setY(
        i,
        broad * (mars ? 0.17 : 0.1) + fine
      );
    }

    geo.computeVertexNormals();
    return geo;
  }, [cx, cz, mars]);

  const groundColor = mars ? "#854536" : "#747b87";
  const rockColor = mars ? "#a75b43" : "#777e89";
  const craterColor = mars ? "#62352b" : "#505763";

  return (
    <group position={[cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={groundColor}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {features.map((feature) =>
        feature.crater ? (
          <group
            key={feature.key}
            position={[feature.x, 0.025, feature.z]}
          >
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry
                args={[
                  feature.scale * 0.55,
                  feature.scale,
                  24,
                ]}
              />
              <meshStandardMaterial
                color={craterColor}
                roughness={1}
              />
            </mesh>

            <mesh
              position={[0, -0.008, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <circleGeometry
                args={[feature.scale * 0.54, 20]}
              />
              <meshStandardMaterial
                color={mars ? "#98513e" : "#666d78"}
                roughness={1}
              />
            </mesh>
          </group>
        ) : (
          <mesh
            key={feature.key}
            position={[
              feature.x,
              feature.scale * 0.12,
              feature.z,
            ]}
            rotation={[0.1, feature.rotation, 0.1]}
            scale={[
              feature.scale * 1.2,
              feature.scale * 0.65,
              feature.scale,
            ]}
            frustumCulled
          >
            <dodecahedronGeometry args={[0.8, 0]} />
            <meshStandardMaterial
              color={rockColor}
              roughness={1}
            />
          </mesh>
        )
      )}
    </group>
  );
}

function ExpandableTerrain({ mars, playerPosRef, worldRadius }) {
  const [activeChunks, updateActiveChunks] = useState(() => {
    const initial = [];

    for (let x = -CHUNK_RADIUS; x <= CHUNK_RADIUS; x += 1) {
      for (let z = -CHUNK_RADIUS; z <= CHUNK_RADIUS; z += 1) {
        initial.push({ cx: x, cz: z });
      }
    }

    return initial;
  });

  const tracker = useRef({ cx: 999999, cz: 999999 });

  useFrame(() => {
    const position = playerPosRef?.current;
    if (!position) return;

    const cx = Math.floor(position.x / CHUNK_SIZE);
    const cz = Math.floor(position.z / CHUNK_SIZE);

    if (cx === tracker.current.cx && cz === tracker.current.cz) {
      return;
    }

    tracker.current = { cx, cz };

    const next = [];

    for (
      let x = cx - CHUNK_RADIUS;
      x <= cx + CHUNK_RADIUS;
      x += 1
    ) {
      for (
        let z = cz - CHUNK_RADIUS;
        z <= cz + CHUNK_RADIUS;
        z += 1
      ) {
        const centerX = (x + 0.5) * CHUNK_SIZE;
        const centerZ = (z + 0.5) * CHUNK_SIZE;

        if (
          Math.hypot(centerX, centerZ) >
          worldRadius + CHUNK_SIZE
        ) {
          continue;
        }

        next.push({ cx: x, cz: z });
      }
    }

    updateActiveChunks(next);
  });

  return (
    <group>
      {activeChunks.map(({ cx, cz }) => (
        <TerrainChunk
          key={`${cx}:${cz}`}
          cx={cx}
          cz={cz}
          mars={mars}
        />
      ))}
    </group>
  );
}

function Terrain({ mars }) {
  const rockColor = mars ? "#b56548" : "#a6abb3";
  const craterColor = mars ? "#63352d" : "#505763";

  return (
    <group>
      {ROCKS.map((rock, index) => (
        <mesh
          key={`rock-${index}`}
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

      {CRATERS.map(([x, z, radius], index) => (
        <group
          key={`crater-${index}`}
          position={[x, 0.028, z]}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry
              args={[radius * 0.65, radius, 40]}
            />
            <meshStandardMaterial
              color={craterColor}
              roughness={1}
            />
          </mesh>

          <mesh
            position={[0, -0.006, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[radius * 0.64, 32]} />
            <meshStandardMaterial
              color={mars ? "#98513e" : "#666d78"}
              roughness={1}
            />
          </mesh>
        </group>
      ))}

      {Array.from({ length: 36 }, (_, index) => {
        const x = Math.sin(index * 12.9898) * 7.5;
        const z = Math.cos(index * 7.233) * 7.5;
        const size = 0.06 + (index % 4) * 0.035;

        return (
          <mesh
            key={`pebble-${index}`}
            position={[x, size * 0.55, z]}
            scale={[1.4, 0.8, 1]}
            rotation={[0.2, index, 0.1]}
            castShadow
          >
            <icosahedronGeometry args={[size, 0]} />
            <meshStandardMaterial
              color={mars ? "#9c5845" : "#9096a0"}
              roughness={1}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function Habitat({ mars }) {
  const bodyColor = mars ? "#d3c4b5" : "#c7d1dc";
  const roofColor = mars ? "#d6a08b" : "#8dc9e8";

  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.15, 1.15, 1.8, 32]} />
        <meshStandardMaterial
          color={bodyColor}
          metalness={0.3}
          roughness={0.55}
        />
      </mesh>

      <mesh position={[0, 2.05, 0]} castShadow>
        <sphereGeometry
          args={[1.12, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshStandardMaterial
          color={roofColor}
          metalness={0.2}
          roughness={0.35}
        />
      </mesh>

      <mesh position={[0, 0.65, 1.16]} castShadow>
        <boxGeometry args={[0.48, 1.15, 0.12]} />
        <meshStandardMaterial color="#263a50" />
      </mesh>

      <mesh position={[0, 1.25, 1.2]}>
        <boxGeometry args={[0.6, 0.08, 0.15]} />
        <meshStandardMaterial
          color="#e4edf5"
          metalness={0.25}
        />
      </mesh>

      <mesh position={[0.62, 1.45, 0.99]}>
        <boxGeometry args={[0.36, 0.35, 0.08]} />
        <meshStandardMaterial
          color="#43b9f5"
          metalness={0.3}
          roughness={0.2}
          emissive="#12364d"
          emissiveIntensity={0.7}
        />
      </mesh>

      {[-1.4, 1.4].map((x) => (
        <mesh key={x} position={[x, 0.65, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.28, 1.2, 20]} />
          <meshStandardMaterial
            color="#8795a5"
            metalness={0.5}
            roughness={0.5}
          />
        </mesh>
      ))}

      <mesh position={[0, 0.12, 0]} receiveShadow>
        <cylinderGeometry args={[1.35, 1.4, 0.2, 32]} />
        <meshStandardMaterial
          color="#526170"
          metalness={0.4}
          roughness={0.65}
        />
      </mesh>

      {[-0.55, 0, 0.55].map((x, index) => (
        <mesh
          key={`status-${index}`}
          position={[x, 1.82, 1.01]}
        >
          <sphereGeometry args={[0.045, 10, 10]} />
          <meshStandardMaterial
            color={index === 1 ? "#facc15" : "#4ade80"}
            emissive={index === 1 ? "#ca8a04" : "#15803d"}
            emissiveIntensity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

function SolarArray({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 1.1, 12]} />
        <meshStandardMaterial
          color="#b8c4d0"
          metalness={0.6}
          roughness={0.45}
        />
      </mesh>

      {[-0.65, 0.65].map((x) => (
        <group key={x} position={[x, 1, 0]}>
          <mesh rotation={[0, 0, -0.08]} castShadow>
            <boxGeometry args={[1.1, 0.07, 1.5]} />
            <meshStandardMaterial
              color="#aeb9c7"
              metalness={0.45}
              roughness={0.45}
            />
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
            <mesh key={`h-${z}`} position={[0, 0.078, z]}>
              <boxGeometry args={[1, 0.012, 0.018]} />
              <meshStandardMaterial color="#72c9ff" />
            </mesh>
          ))}

          {[-0.25, 0, 0.25].map((xLine) => (
            <mesh
              key={`v-${xLine}`}
              position={[xLine, 0.079, 0]}
            >
              <boxGeometry args={[0.015, 0.012, 1.35]} />
              <meshStandardMaterial color="#72c9ff" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Rover({ mars }) {
  return (
    <group position={[2.5, 0, 1.6]} rotation={[0, -0.35, 0]}>
      <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.38, 0.8]} />
        <meshStandardMaterial
          color={mars ? "#d78c48" : "#e0a94d"}
          metalness={0.35}
          roughness={0.5}
        />
      </mesh>

      <mesh position={[0, 0.95, -0.05]} castShadow>
        <boxGeometry args={[0.4, 0.2, 0.35]} />
        <meshStandardMaterial
          color="#d8e2ec"
          metalness={0.25}
          roughness={0.45}
        />
      </mesh>

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
            <cylinderGeometry args={[0.2, 0.2, 0.13, 20]} />
            <meshStandardMaterial
              color="#252d37"
              roughness={0.9}
            />
          </mesh>
        ))
      )}

      <mesh position={[0.25, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.55, 10]} />
        <meshStandardMaterial color="#dbe5ef" metalness={0.5} />
      </mesh>

      <mesh position={[0, 0.7, 0.42]}>
        <boxGeometry args={[0.18, 0.09, 0.035]} />
        <meshStandardMaterial
          color="#fff1b8"
          emissive="#fbbf24"
          emissiveIntensity={0.65}
        />
      </mesh>
    </group>
  );
}

function SupplyCache({ mars }) {
  return (
    <group position={[5.5, 0, -3.5]}>
      <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.72, 0.72]} />
        <meshStandardMaterial
          color={mars ? "#b96c4e" : "#8b9aab"}
          metalness={0.25}
          roughness={0.7}
        />
      </mesh>

      <mesh position={[0, 0.39, 0.37]}>
        <boxGeometry args={[0.62, 0.12, 0.035]} />
        <meshStandardMaterial
          color="#facc15"
          emissive="#8a5b0a"
          emissiveIntensity={0.25}
        />
      </mesh>

      {[-0.32, 0.32].map((x) => (
        <mesh
          key={x}
          position={[x, 0.38, 0.38]}
          castShadow
        >
          <boxGeometry args={[0.06, 0.8, 0.06]} />
          <meshStandardMaterial color="#d7e0ea" />
        </mesh>
      ))}

      <mesh position={[0, 0.78, 0]} castShadow>
        <boxGeometry args={[0.94, 0.08, 0.76]} />
        <meshStandardMaterial
          color="#d8e2ec"
          metalness={0.35}
          roughness={0.55}
        />
      </mesh>

      <pointLight
        position={[0, 1.15, 0]}
        color={mars ? "#ffb08a" : "#7dd3fc"}
        intensity={0.55}
        distance={3}
      />
    </group>
  );
}

function CommunicationAntenna({ mars }) {
  return (
    <group position={[-2.5, 0, -1.2]}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.07, 2.4, 14]} />
        <meshStandardMaterial
          color="#d5dde6"
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>

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

      <mesh position={[0, 2.25, 0.08]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial
          color={mars ? "#ffb08a" : "#59c7ff"}
          emissive={mars ? "#7c2d12" : "#123b54"}
          emissiveIntensity={0.8}
        />
      </mesh>

      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.32, 0.24, 16]} />
        <meshStandardMaterial color="#657586" />
      </mesh>
    </group>
  );
}

function ZoneRing({
  survivalRef,
  center = [0, 0, 0],
  radius = 24,
  height = 3,
}) {
  const group = useRef();
  const ringMat = useRef();
  const wallMat = useRef();

  useFrame(({ clock }) => {
    const state = survivalRef?.current;
    if (!group.current) return;

    const activeRadius =
      Number.isFinite(state?.radius) && state.radius > 0
        ? state.radius
        : radius;

    group.current.scale.set(activeRadius, 1, activeRadius);

    const inZone = state?.inZone !== false;
    const color = inZone ? "#38bdf8" : "#ef4444";

    if (ringMat.current) {
      ringMat.current.color.set(color);
      ringMat.current.opacity = inZone ? 0.95 : 1;
    }

    if (wallMat.current) {
      wallMat.current.color.set(color);
      wallMat.current.opacity =
        (inZone ? 0.055 : 0.13) +
        0.025 * Math.sin(clock.elapsedTime * 2.5);
    }
  });

  return (
    <group ref={group} position={center}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.06, 0]}
      >
        <ringGeometry args={[0.985, 1, 128]} />
        <meshBasicMaterial
          ref={ringMat}
          color="#38bdf8"
          transparent
          opacity={0.95}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[1, 1, height, 128, 1, true]} />
        <meshBasicMaterial
          ref={wallMat}
          color="#38bdf8"
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Outpost({ mars }) {
  return (
    <group>
      <Terrain mars={mars} />
      <Habitat mars={mars} />
      <SolarArray position={[-2.2, 0, 1.1]} />
      <SolarArray position={[-2.2, 0, 2.7]} />
      <Rover mars={mars} />
      <SupplyCache mars={mars} />
      <CommunicationAntenna mars={mars} />
    </group>
  );
}

function MissionScene({
  planet = "moon",
  playerPosRef,
  survivalRef,
  worldConfig = DEFAULT_WORLD_CONFIG,
  onPhysicalInteraction,
  taskInfo = null,
  cameraMode = "follow",
}) {
  const mars = planet === "mars";
  const skyColor = mars ? "#301c20" : "#070d19";
  const title = mars ? "MARS OUTPOST" : "LUNAR OUTPOST";
  const accentColor = mars ? "#ffad8a" : "#7dd3fc";

  const [interactionPrompt, setInteractionPrompt] = useState(null);

  const worldRadius =
    Number.isFinite(worldConfig?.worldRadius) &&
    worldConfig.worldRadius > 0
      ? worldConfig.worldRadius
      : DEFAULT_WORLD_CONFIG.worldRadius;

  const safeZoneRadius =
    Number.isFinite(worldConfig?.safeZoneRadius) &&
    worldConfig.safeZoneRadius > 0
      ? worldConfig.safeZoneRadius
      : DEFAULT_WORLD_CONFIG.safeZoneRadius;

  const center = worldConfig?.safeZoneCenter ?? { x: 0, z: 0 };

  const activeStep = taskInfo?.step ?? null;

  const interactionTargets = useMemo(() => {
    if (
      !activeStep ||
      activeStep.existing ||
      !activeStep.position
    ) {
      return INTERACTION_TARGETS;
    }

    return [
      ...INTERACTION_TARGETS,
      {
        id: activeStep.stationId,
        type: "station",
        label: activeStep.label,
        key: activeStep.key ?? "e",
        position: activeStep.position,
        radius: 3.2,
      },
    ];
  }, [activeStep]);

  const panelStyle = {
    position: "absolute",
    zIndex: 2,
    color: "#f1f5f9",
    background: "rgba(5, 12, 25, 0.82)",
    border: `1px solid ${
      mars
        ? "rgba(255, 173, 138, 0.4)"
        : "rgba(125, 211, 252, 0.4)"
    }`,
    borderRadius: 10,
    padding: "12px 16px",
    fontFamily: "Arial, sans-serif",
    pointerEvents: "none",
    backdropFilter: "blur(8px)",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.18)",
  };

  return (
    <section
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: skyColor,
      }}
    >
      <Canvas
        shadows
        dpr={[1, 1.25]}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
        }}
        camera={{
          position: [8, 7, 10],
          fov: 45,
          near: 0.1,
          far: 180,
        }}
      >
        <color attach="background" args={[skyColor]} />
        <fog attach="fog" args={[skyColor, 55, 145]} />

        <StarField mars={mars} />

        <hemisphereLight
          args={[
            mars ? "#d58b77" : "#b7d2ff",
            mars ? "#42241d" : "#343b4a",
            mars ? 1.05 : 0.75,
          ]}
        />

        <directionalLight
          position={[-7, 12, 6]}
          intensity={mars ? 2.3 : 3.1}
          color={mars ? "#ffd0b5" : "#fff3d7"}
          castShadow
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
          shadow-normalBias={0.035}
        />

        <directionalLight
          position={[5, 6, -6]}
          intensity={mars ? 0.65 : 0.9}
          color={mars ? "#e9a18b" : "#9ccaff"}
        />

        <pointLight
          position={[-4, 4, -4]}
          intensity={mars ? 0.7 : 0.5}
          color={mars ? "#ff9b76" : "#8acbff"}
          distance={22}
        />

        {mars && (
          <pointLight
            position={[4, 2, 4]}
            intensity={0.35}
            color="#d86b4c"
            distance={15}
          />
        )}

        <Outpost mars={mars} />

        <ExpandableTerrain
          mars={mars}
          playerPosRef={playerPosRef}
          worldRadius={worldRadius}
        />

        <ZoneRing
          survivalRef={survivalRef}
          center={[center.x ?? 0, 0, center.z ?? 0]}
          radius={safeZoneRadius}
        />

        <TaskStationMarker step={activeStep} />

        <PlayerController
          obstacles={OUTPOST_OBSTACLES}
          playerPosRef={playerPosRef}
          worldRadius={worldRadius}
          interactionTargets={interactionTargets}
          onPhysicalInteraction={onPhysicalInteraction}
          onInteractionPromptChange={setInteractionPrompt}
          cameraMode={cameraMode}
        />
      </Canvas>

      {/* Mini-map overlay: MissionMap controls its own position. */}
      <MissionMap
        playerPosRef={playerPosRef}
        survivalRef={survivalRef}
        taskInfo={taskInfo}
        targets={interactionTargets}
        safeZone={{
          center: {
            x: center.x ?? 0,
            z: center.z ?? 0,
          },
          radius: safeZoneRadius,
        }}
        worldRadius={worldRadius}
      />

      {interactionPrompt && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "absolute",
            zIndex: 10,
            left: "50%",
            bottom: 100,
            transform: "translateX(-50%)",
            width: "max-content",
            maxWidth: "calc(100% - 32px)",
            boxSizing: "border-box",
            padding: "13px 18px",
            borderRadius: 12,
            border: `1px solid ${
              mars
                ? "rgba(255, 173, 138, 0.65)"
                : "rgba(125, 211, 252, 0.65)"
            }`,
            background: "rgba(5, 12, 25, 0.94)",
            color: "#f8fafc",
            textAlign: "center",
            fontFamily: "Arial, sans-serif",
            boxShadow: "0 8px 28px rgba(0, 0, 0, 0.4)",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {interactionPrompt.key?.toUpperCase()} —{" "}
            {interactionPrompt.label}
          </div>

          <div
            style={{
              marginTop: 5,
              fontSize: 11,
              color: "#cbd5e1",
            }}
          >
            Press {interactionPrompt.key?.toUpperCase()} to interact
          </div>
        </div>
      )}

      <ObjectiveGuide
        taskInfo={taskInfo}
        playerPosRef={playerPosRef}
      />

      <div
        className="scene-title-card"
        style={{
          ...panelStyle,
          top: 14,
          left: 14,
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: 2,
            color: accentColor,
            marginBottom: 5,
          }}
        >
          ASTROBASE
          <span className="scene-hide-mobile"> // 3D ENVIRONMENT</span>
        </div>

        <div style={{ fontSize: 18, fontWeight: 700 }}>
          {title}
        </div>

        <div
          style={{
            marginTop: 5,
            fontSize: 11,
            color: "#cbd5e1",
          }}
        >
          {mars
            ? "MARS SURFACE // RED PLANET"
            : "LUNAR SURFACE // MOON"}
        </div>

        <div
          className="scene-hide-mobile"
          style={{
            marginTop: 6,
            fontSize: 11,
            color: "#cbd5e1",
          }}
        >
          World radius: {worldRadius} m
        </div>
      </div>

      <div
        className="scene-controls-hint"
        style={{
          ...panelStyle,
          bottom: 14,
          left: 14,
          fontSize: 12,
        }}
      >
        WASD / Arrow Keys: Move · Shift: Run
        <div style={{ marginTop: 5, color: accentColor }}>
          Near an object: E Interact · F Solar · R Rover
        </div>
      </div>

      <div
        className="scene-safe-chip"
        style={{
          ...panelStyle,
          bottom: 14,
          right: 14,
          fontSize: 11,
          color: "#cbd5e1",
        }}
      >
        {`SAFE ZONE: ${safeZoneRadius} m`}
      </div>
    </section>
  );
}

export default memo(MissionScene);
