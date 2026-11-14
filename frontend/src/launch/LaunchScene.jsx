import {
  Suspense,
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import Rocket from "./Rocket";
import {
  EARTH_SPEC,
  PHASE_BY_KEY,
  STAGE_CUTS,
  TOTAL_TIME,
  clamp01,
  fadeAt,
  getPhase,
  lerp,
  smoothstep,
} from "./launchConfig";

const SKY_LOW = new THREE.Color("#22345f");
const SKY_SPACE = new THREE.Color("#02030a");

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

/* ------------------------------------------------------------------ *
 * Optional NASA texture. If the file is missing, nothing breaks.
 * ------------------------------------------------------------------ */
function useOptionalTexture(url) {
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    if (!url) return undefined;

    let cancelled = false;
    let loaded = null;

    new THREE.TextureLoader().load(
      url,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        loaded = tex;
        setTexture(tex);
      },
      undefined,
      () => {
        /* missing or not an image: keep the procedural colours */
      }
    );

    return () => {
      cancelled = true;
      if (loaded) loaded.dispose();
    };
  }, [url]);

  return texture;
}

/* ------------------------------------------------------------------ *
 * Stars
 * ------------------------------------------------------------------ */
function Stars({ materialRef }) {
  const positions = useMemo(() => {
    const random = seededRandom(2026);
    const list = [];
    for (let i = 0; i < 900; i += 1) {
      const theta = random() * Math.PI * 2;
      const y = random() * 2 - 1;
      const radius = 230;
      const horizontal = Math.sqrt(1 - y * y);
      list.push(
        Math.cos(theta) * horizontal * radius,
        y * radius,
        Math.sin(theta) * horizontal * radius
      );
    }
    return new Float32Array(list);
  }, []);

  return (
    <points frustumCulled={false} renderOrder={-1}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color="#dceaff"
        size={1}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
        fog={false}
      />
    </points>
  );
}

/* ------------------------------------------------------------------ *
 * Planet sphere (Moon, Mars or Earth)
 * ------------------------------------------------------------------ */
const Planet = forwardRef(function Planet({ spec }, ref) {
  const texture = useOptionalTexture(spec.textureUrl);

  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 64, 48);
    const position = geo.attributes.position;
    const colors = new Float32Array(position.count * 3);
    const a = new THREE.Color(spec.colors[0]);
    const b = new THREE.Color(spec.colors[1]);
    const c = new THREE.Color(spec.colors[2]);
    const white = new THREE.Color("#ffffff");
    const mix = new THREE.Color();

    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);

      const n =
        0.5 +
        0.25 * Math.sin(x * 6.1 + y * 3.7) * Math.cos(z * 5.3 - x * 2.1) +
        0.25 * Math.sin(y * 11.3 + z * 7.9);

      mix.copy(a).lerp(b, clamp01(n)).lerp(c, clamp01((n - 0.65) * 2));
      if (spec.cap && Math.abs(y) > 0.92) mix.lerp(white, 0.8);

      colors[i * 3] = mix.r;
      colors[i * 3 + 1] = mix.g;
      colors[i * 3 + 2] = mix.b;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [spec]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group ref={ref}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          key={texture ? "textured" : "flat"}
          vertexColors={!texture}
          map={texture || null}
          roughness={1}
          metalness={0}
        />
      </mesh>
      {spec.atmosphere && (
        <mesh scale={1.04}>
          <sphereGeometry args={[1, 48, 32]} />
          <meshBasicMaterial
            color={spec.atmosphere}
            transparent
            opacity={0.18}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
});

/* ------------------------------------------------------------------ *
 * Smoke / dust puffs (one InstancedMesh, cheap)
 * ------------------------------------------------------------------ */
const Puffs = forwardRef(function Puffs(
  { count = 160, color = "#d7dbe3", opacity = 0.5 },
  ref
) {
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const cursor = useRef(0);
  const particles = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        life: 1,
        max: 1,
        size: 1,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
      })),
    [count]
  );

  useImperativeHandle(
    ref,
    () => ({
      emit(x, y, z, spread, up, size, life) {
        const p = particles[cursor.current];
        cursor.current = (cursor.current + 1) % count;
        const angle = Math.random() * Math.PI * 2;
        const radius = spread * (0.4 + Math.random() * 0.6);
        p.life = 0;
        p.max = life * (0.7 + Math.random() * 0.6);
        p.size = size * (0.6 + Math.random() * 0.8);
        p.position.set(x, y, z);
        p.velocity.set(
          Math.cos(angle) * radius,
          up * (0.3 + Math.random() * 0.7),
          Math.sin(angle) * radius
        );
      },
      update(dt) {
        if (!mesh.current) return;
        for (let i = 0; i < count; i += 1) {
          const p = particles[i];
          if (p.life >= p.max) {
            dummy.scale.setScalar(0.0001);
          } else {
            p.life += dt;
            p.position.addScaledVector(p.velocity, dt);
            p.velocity.multiplyScalar(Math.max(0, 1 - 1.2 * dt));
            const k = clamp01(p.life / p.max);
            const size = p.size * (0.4 + k * 1.8) * (1 - k * k);
            dummy.position.copy(p.position);
            dummy.scale.setScalar(Math.max(size, 0.0001));
          }
          dummy.updateMatrix();
          mesh.current.setMatrixAt(i, dummy.matrix);
        }
        mesh.current.instanceMatrix.needsUpdate = true;
      },
    }),
    [count, dummy, particles]
  );

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, count]}
      frustumCulled={false}
    >
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </instancedMesh>
  );
});

/* ------------------------------------------------------------------ *
 * Static environments
 * ------------------------------------------------------------------ */
function PadScene() {
  const mountains = useMemo(() => {
    const random = seededRandom(77);
    return Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2;
      const radius = 110 + random() * 40;
      const height = 16 + random() * 30;
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        height,
        width: 14 + random() * 12,
      };
    });
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <circleGeometry args={[240, 48]} />
        <meshStandardMaterial color="#1b2330" roughness={1} />
      </mesh>

      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[6.5, 7, 0.3, 40]} />
        <meshStandardMaterial color="#3b4455" roughness={0.9} />
      </mesh>

      {/* Launch tower */}
      <mesh position={[-3.6, 7, 0]}>
        <boxGeometry args={[0.7, 14, 0.7]} />
        <meshStandardMaterial color="#8a97a8" metalness={0.5} roughness={0.5} />
      </mesh>
      {[3, 6, 9, 12].map((y) => (
        <mesh key={y} position={[-2.3, y, 0]}>
          <boxGeometry args={[2.6, 0.18, 0.18]} />
          <meshStandardMaterial color="#b7c2d0" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[-3.6, 14.3, 0]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial color="#ff4d4d" emissive="#ff2222" emissiveIntensity={1.2} />
      </mesh>

      {mountains.map((m, i) => (
        <mesh key={i} position={[m.x, m.height / 2 - 1, m.z]}>
          <coneGeometry args={[m.width, m.height, 5]} />
          <meshStandardMaterial color="#0f1626" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function LandingScene({ cfg }) {
  const rocks = useMemo(() => {
    const random = seededRandom(cfg.key === "mars" ? 411 : 233);
    return Array.from({ length: 18 }, () => {
      const angle = random() * Math.PI * 2;
      const radius = 12 + random() * 55;
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        scale: 0.5 + random() * 1.9,
        rotation: random() * Math.PI * 2,
      };
    });
  }, [cfg.key]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[260, 48]} />
        <meshStandardMaterial color={cfg.landing.ground} roughness={1} />
      </mesh>

      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[4.5, 4.7, 0.1, 40]} />
        <meshStandardMaterial color="#4a5262" metalness={0.3} roughness={0.8} />
      </mesh>

      {[0, 90, 180, 270].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <mesh key={angle} position={[Math.cos(rad) * 4, 0.12, Math.sin(rad) * 4]}>
            <sphereGeometry args={[0.14, 10, 10]} />
            <meshStandardMaterial color={cfg.accent} emissive={cfg.accent} emissiveIntensity={1} />
          </mesh>
        );
      })}

      {rocks.map((rock, i) => (
        <mesh
          key={i}
          position={[rock.x, rock.scale * 0.2, rock.z]}
          rotation={[0.1, rock.rotation, 0.1]}
          scale={[rock.scale * 1.2, rock.scale * 0.65, rock.scale]}
        >
          <dodecahedronGeometry args={[0.8, 0]} />
          <meshStandardMaterial color={cfg.landing.rock} roughness={1} />
        </mesh>
      ))}

      {/* Outpost dome in the distance: it is where the player is heading */}
      <group position={[-22, 0, -18]}>
        <mesh position={[0, 1.05, 0]}>
          <cylinderGeometry args={[2.3, 2.3, 2, 28]} />
          <meshStandardMaterial color="#c7d1dc" metalness={0.3} roughness={0.55} />
        </mesh>
        <mesh position={[0, 2.05, 0]}>
          <sphereGeometry args={[2.25, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#8dc9e8" metalness={0.2} roughness={0.35} />
        </mesh>
      </group>

      {cfg.landing.earthInSky && (
        <group position={[-70, 55, -160]} scale={6}>
          <Planet spec={EARTH_SPEC} />
        </group>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * The animator: reads one clock and moves everything
 * ------------------------------------------------------------------ */
function LaunchWorld({ cfg, onHud, onFinish, onReady, fadeRef, barRef }) {
  const { scene, camera } = useThree();

  const timeRef = useRef(0);
  const doneRef = useRef(false);
  const readyRef = useRef(false);
  const hudSignature = useRef("");
  const emitters = useRef({ ground: 0, trail: 0, dust: 0, touched: false });

  const padRef = useRef();
  const spaceRef = useRef();
  const landRef = useRef();
  const rocketRef = useRef();
  const flameRef = useRef();
  const planetRef = useRef();
  const earthRef = useRef();
  const smokeRef = useRef();
  const dustRef = useRef();
  const starsMaterialRef = useRef();

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05); // a hidden tab must not skip the show
    timeRef.current += dt;
    const t = Math.min(timeRef.current, TOTAL_TIME);
    const phase = getPhase(t);

    if (!readyRef.current) {
      readyRef.current = true;
      onReady();
    }

    const stage =
      t < STAGE_CUTS[0] ? "pad" : t < STAGE_CUTS[1] ? "space" : "land";

    padRef.current.visible = stage === "pad";
    spaceRef.current.visible = stage === "space";
    landRef.current.visible = stage === "land";

    const rocket = rocketRef.current;
    let y = 0;
    let thrust = 0;

    /* ---------------- rocket ---------------- */
    if (stage === "pad") {
      if (phase.key === "ignition") thrust = smoothstep(0, 1, phase.local);
      if (phase.key === "liftoff") {
        thrust = 1;
        const tau = t - PHASE_BY_KEY.liftoff.start;
        y = 0.5 * 9.6 * tau * tau;
      }
      rocket.position.set((Math.random() - 0.5) * 0.05 * thrust, y, 0);
      rocket.rotation.set(0, 0, 0);
    } else if (stage === "space") {
      thrust = 0.75;
      rocket.position.set(0, 0, 0);
      rocket.rotation.set(-Math.PI / 2, 0, Math.sin(t * 1.3) * 0.03);
    } else {
      const tau = clamp01(phase.local / 0.7);
      y = 70 * Math.pow(1 - tau, cfg.landing.exponent);
      thrust = tau < 1 ? 0.95 : 0;
      rocket.position.set(0, y, 0);
      rocket.rotation.set(0, 0, 0);
    }

    const flame = flameRef.current;
    flame.visible = thrust > 0.02;
    if (flame.visible) {
      flame.scale.set(
        0.6 + 0.4 * thrust,
        thrust * (0.85 + Math.random() * 0.3),
        0.6 + 0.4 * thrust
      );
    }

    /* ---------------- particles ---------------- */
    const em = emitters.current;
    const smoke = smokeRef.current;
    const dust = dustRef.current;

    if (stage === "pad" && thrust > 0.05) {
      if (y < 45) {
        em.ground += 70 * thrust * dt;
        while (em.ground >= 1) {
          smoke.emit(0, 0.5, 0, 7, 1.6, 1.8, 2.4);
          em.ground -= 1;
        }
      }
      if (y > 2) {
        em.trail += 45 * dt;
        while (em.trail >= 1) {
          smoke.emit(0, y - 0.5, 0, 0.8, -3, 0.7, 1.2);
          em.trail -= 1;
        }
      }
    }

    if (stage === "land") {
      const near = clamp01((25 - y) / 25);
      if (thrust > 0 && near > 0) {
        em.dust += 55 * near * dt;
        while (em.dust >= 1) {
          dust.emit(0, 0.25, 0, 5 + near * 4, 0.8, 1.6, 2.2);
          em.dust -= 1;
        }
      }
      if (thrust === 0 && !em.touched) {
        em.touched = true;
        for (let i = 0; i < 30; i += 1) dust.emit(0, 0.25, 0, 7, 1.2, 1.8, 2.6);
      }
    }

    smoke.update(dt);
    dust.update(dt);

    /* ---------------- planets in space ---------------- */
    if (stage === "space") {
      const k = smoothstep(0, 1, phase.local);
      const planet = planetRef.current;
      planet.position.set(lerp(30, 14, k), lerp(8, 1, k), lerp(-170, -60, k));
      planet.scale.setScalar(lerp(9, 18, k));
      planet.rotation.y += dt * 0.03;

      const earth = earthRef.current;
      earth.position.set(lerp(-14, -34, k), lerp(-2, -9, k), lerp(-2, -30, k));
      earth.scale.setScalar(lerp(6, 1.4, k));
      earth.rotation.y += dt * 0.05;
    }

    /* ---------------- sky, fog, stars ---------------- */
    const bg = scene.background;
    if (bg && bg.isColor) {
      if (stage === "pad") bg.copy(SKY_LOW).lerp(SKY_SPACE, clamp01(y / 90));
      else if (stage === "space") bg.copy(SKY_SPACE);
      else bg.set(cfg.landing.sky);
    }

    const fog = scene.fog;
    if (fog) {
      if (stage === "land") {
        fog.color.set(cfg.landing.fog);
        fog.near = cfg.landing.fogNear;
        fog.far = cfg.landing.fogFar;
      } else if (stage === "pad") {
        fog.color.copy(bg);
        fog.near = 80;
        fog.far = 260;
      } else {
        fog.near = 2000;
        fog.far = 4000;
      }
    }

    starsMaterialRef.current.opacity =
      stage === "pad"
        ? 0.12 + 0.88 * clamp01(y / 80)
        : stage === "space"
          ? 1
          : cfg.landing.starOpacity;

    /* ---------------- camera ---------------- */
    let cx;
    let cy;
    let cz;
    let lx = 0;
    let ly = 0;
    let lz = 0;
    let shake = 0;

    if (stage === "pad") {
      if (phase.key === "countdown") {
        const k = smoothstep(0, 1, phase.local);
        cx = lerp(12, 9, k);
        cy = lerp(4, 3.2, k);
        cz = lerp(21, 15, k);
        ly = 5;
      } else {
        cx = 9;
        cy = 3.2 + y * 0.85;
        cz = 15 + y * 0.05;
        ly = 5 + y * 0.95;
        if (phase.key === "ignition") shake = 0.04 + 0.12 * thrust;
        else shake = 0.14 * Math.max(0, 1 - (t - PHASE_BY_KEY.liftoff.start) / 2.5);
      }
    } else if (stage === "space") {
      const angle = -0.6 + phase.local * 0.5;
      cx = Math.sin(angle) * 14;
      cy = 2.5 + phase.local;
      cz = Math.cos(angle) * 14;
      lz = -6;
    } else {
      const k = clamp01((phase.local - 0.7) / 0.3);
      cx = lerp(16, 11, k);
      cy = 3.5 + y * 0.3;
      cz = lerp(20, 14, k);
      ly = 3 + y * 0.55;
      if (cfg.key === "mars") shake = y < 6 && thrust > 0 ? 0.05 : 0;
      if (em.touched) shake = Math.max(shake, 0.12 * (1 - k));
    }

    camera.position.set(
      cx + (Math.random() - 0.5) * shake,
      cy + (Math.random() - 0.5) * shake,
      cz + (Math.random() - 0.5) * shake
    );
    camera.lookAt(lx, ly, lz);

    /* ---------------- DOM overlay (no React re-render) ---------------- */
    if (fadeRef.current) fadeRef.current.style.opacity = String(fadeAt(t));
    if (barRef.current) {
      barRef.current.style.transform = `scaleX(${clamp01(t / TOTAL_TIME)})`;
    }

    let big = "";
    if (phase.key === "countdown") {
      big = `T-${Math.max(1, Math.ceil(PHASE_BY_KEY.countdown.end - t))}`;
    } else if (phase.key === "ignition") {
      big = "IGNITION";
    } else if (phase.key === "liftoff" && t - PHASE_BY_KEY.liftoff.start < 1.6) {
      big = "LIFTOFF";
    }
    const signature = `${phase.key}|${big}`;
    if (signature !== hudSignature.current) {
      hudSignature.current = signature;
      onHud({ phase: phase.key, big });
    }

    if (t >= TOTAL_TIME && !doneRef.current) {
      doneRef.current = true;
      onFinish();
    }
  });

  return (
    <>
      <color attach="background" args={["#22345f"]} />
      <fog attach="fog" args={["#22345f", 80, 260]} />

      <hemisphereLight args={["#b7d2ff", "#2a303c", 0.7]} />
      <directionalLight
        position={[-30, 20, 40]}
        intensity={cfg.landing.sun.intensity}
        color={cfg.landing.sun.color}
      />
      <directionalLight position={[20, 10, -20]} intensity={0.5} color="#9ccaff" />

      <Stars materialRef={starsMaterialRef} />

      <group ref={padRef}>
        <PadScene />
        <Puffs ref={smokeRef} count={160} color="#d7dbe3" opacity={0.5} />
      </group>

      <group ref={spaceRef} visible={false}>
        <Planet ref={planetRef} spec={cfg.planet} />
        <Planet ref={earthRef} spec={EARTH_SPEC} />
      </group>

      <group ref={landRef} visible={false}>
        <LandingScene cfg={cfg} />
        <Puffs ref={dustRef} count={110} color={cfg.landing.dust} opacity={0.45} />
      </group>

      <Suspense
        fallback={
          <group ref={rocketRef}>
            <mesh position={[0, 3.5, 0]}>
              <cylinderGeometry args={[0.42, 0.42, 6, 16]} />
              <meshStandardMaterial color="#d9e0e8" metalness={0.55} roughness={0.35} />
            </mesh>
            <mesh position={[0, 6.65, 0]}>
              <coneGeometry args={[0.42, 1.3, 16]} />
              <meshStandardMaterial color="#ef4444" metalness={0.35} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.65, 0]}>
              <coneGeometry args={[0.72, 1.3, 4]} />
              <meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.4} />
            </mesh>
            <group ref={flameRef} position={[0, -0.35, 0]} visible={false}>
              <mesh position={[0, -1.3, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.55, 2.6, 18]} />
                <meshBasicMaterial color="#ff8a2a" transparent opacity={0.85} depthWrite={false} />
              </mesh>
              <mesh position={[0, -0.95, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.3, 1.9, 14]} />
                <meshBasicMaterial color="#fff2b0" transparent opacity={0.95} depthWrite={false} />
              </mesh>
            </group>
          </group>
        }
      >
        <Rocket ref={rocketRef} flameRef={flameRef} accent={cfg.accent} />
      </Suspense>
    </>
  );
}

function LaunchScene(props) {
  return (
    <Canvas
      dpr={[1, 1.25]}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      camera={{ position: [12, 4, 21], fov: 45, near: 0.1, far: 600 }}
      style={{ position: "absolute", inset: 0 }}
    >
      <LaunchWorld {...props} />
    </Canvas>
  );
}

// memo: the HUD re-renders a few times; the 3D scene must not.
export default memo(LaunchScene);