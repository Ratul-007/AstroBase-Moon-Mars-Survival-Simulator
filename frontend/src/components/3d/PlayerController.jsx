
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import AstronautModel from "./AstronautModel";

const WALK_SPEED = 7.5;
const RUN_SPEED = 13.5;
const ACCELERATION = 14;
const DECELERATION = 18;
const ROTATION_SPEED = 16;

const DEFAULT_WORLD_RADIUS = 120;
const PLAYER_RADIUS = 0.45;

const CAMERA_HEIGHT = 3.1;
const CAMERA_DISTANCE = 5.8;
const CAMERA_SMOOTHING = 10;
const CAMERA_LOOK_HEIGHT = 1.25;
const ORBIT_DISTANCE = 6.4;
const ORBIT_MIN_PITCH = 0.1;
const ORBIT_MAX_PITCH = 1.05;
const ORBIT_SENSITIVITY = 0.007;

const COLLISION_PADDING = 0.12;
const INTERACTION_CHECK_INTERVAL = 0.1;

const MOVEMENT_KEYS = new Set([
  "w",
  "a",
  "s",
  "d",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "shift",
]);

const INTERACTION_KEYS = new Set(["e", "f", "r"]);

function isEditableTarget(event) {
  const path =
    typeof event.composedPath === "function"
      ? event.composedPath()
      : [event.target];

  return path.some((node) => {
    if (!(node instanceof Element)) return false;

    if (node.isContentEditable) return true;

    return Boolean(
      node.matches(
        'input, textarea, select, [contenteditable="true"], [role="textbox"]'
      )
    );
  });
}

function resolveCollision(x, z, obstacles) {
  let nextX = x;
  let nextZ = z;

  for (let pass = 0; pass < 3; pass += 1) {
    for (const obstacle of obstacles) {
      if (obstacle.type === "circle") {
        const dx = nextX - obstacle.x;
        const dz = nextZ - obstacle.z;
        const distance = Math.hypot(dx, dz);

        const minDistance =
          PLAYER_RADIUS +
          (obstacle.radius ?? 0.5) +
          COLLISION_PADDING;

        if (distance < minDistance) {
          if (distance > 0.0001) {
            const push = minDistance - distance;

            nextX += (dx / distance) * push;
            nextZ += (dz / distance) * push;
          } else {
            nextX += minDistance;
          }
        }
      }

      if (obstacle.type === "box") {
        const halfX =
          obstacle.width != null
            ? obstacle.width / 2
            : obstacle.halfX ?? 0.5;

        const halfZ =
          obstacle.depth != null
            ? obstacle.depth / 2
            : obstacle.halfZ ?? 0.5;

        const minX =
          obstacle.x - halfX - PLAYER_RADIUS - COLLISION_PADDING;
        const maxX =
          obstacle.x + halfX + PLAYER_RADIUS + COLLISION_PADDING;
        const minZ =
          obstacle.z - halfZ - PLAYER_RADIUS - COLLISION_PADDING;
        const maxZ =
          obstacle.z + halfZ + PLAYER_RADIUS + COLLISION_PADDING;

        if (
          nextX > minX &&
          nextX < maxX &&
          nextZ > minZ &&
          nextZ < maxZ
        ) {
          const pushLeft = Math.abs(nextX - minX);
          const pushRight = Math.abs(maxX - nextX);
          const pushTop = Math.abs(nextZ - minZ);
          const pushBottom = Math.abs(maxZ - nextZ);

          const smallest = Math.min(
            pushLeft,
            pushRight,
            pushTop,
            pushBottom
          );

          if (smallest === pushLeft) {
            nextX = minX;
          } else if (smallest === pushRight) {
            nextX = maxX;
          } else if (smallest === pushTop) {
            nextZ = minZ;
          } else {
            nextZ = maxZ;
          }
        }
      }
    }
  }

  return { x: nextX, z: nextZ };
}

function constrainToWorld(x, z, worldRadius) {
  const maxRadius = Math.max(1, worldRadius - PLAYER_RADIUS);
  const distance = Math.hypot(x, z);

  if (distance <= maxRadius) return { x, z };

  const scale = maxRadius / distance;

  return {
    x: x * scale,
    z: z * scale,
  };
}

function findNearestInteraction(x, z, targets) {
  let nearest = null;
  let nearestDistance = Infinity;

  for (const target of targets) {
    if (
      !target ||
      !target.position ||
      !Number.isFinite(target.position.x) ||
      !Number.isFinite(target.position.z)
    ) {
      continue;
    }

    const distance = Math.hypot(
      x - target.position.x,
      z - target.position.z
    );

    const interactionRadius =
      Number.isFinite(target.radius) && target.radius > 0
        ? target.radius
        : 2.5;

    if (
      distance <= interactionRadius &&
      distance < nearestDistance
    ) {
      nearest = target;
      nearestDistance = distance;
    }
  }

  return nearest
    ? { target: nearest, distance: nearestDistance }
    : null;
}

function PlayerController({
  obstacles = [],
  playerPosRef,
  worldRadius = DEFAULT_WORLD_RADIUS,
  onPositionChange,
  interactionTargets = [],
  onPhysicalInteraction,
  onInteractionPromptChange,
  cameraMode = "follow",
}) {
  const playerRef = useRef();

  const keysRef = useRef(new Set());
  const pressedKeysRef = useRef(new Set());

  const velocityRef = useRef({ x: 0, z: 0 });

  const movement = useRef({
    moving: false,
    running: false,
    walkCycle: 0,
    moveX: 0,
    moveZ: 0,
  });

  const { camera, gl } = useThree();

  const desiredCameraPosition = useRef(
    new THREE.Vector3(0, CAMERA_HEIGHT, CAMERA_DISTANCE + 3)
  );

  const lookTarget = useRef(
    new THREE.Vector3(0, CAMERA_LOOK_HEIGHT, 0)
  );

  const nearestInteractionRef = useRef(null);
  const lastPromptIdRef = useRef(null);
  const interactionCheckTimerRef = useRef(0);
  const positionSnapshotRef = useRef({ x: 0, z: 3 });
  const orbitRef = useRef({
    yaw: 0,
    pitch: 0.35,
    dragging: false,
    pointerId: null,
    initialized: false,
  });

  const safeWorldRadius =
    Number.isFinite(worldRadius) && worldRadius > 1
      ? worldRadius
      : DEFAULT_WORLD_RADIUS;

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Let the browser handle keystrokes inside text-entry controls.
      if (isEditableTarget(event)) {
        return;
      }

      const key = event.key.toLowerCase();

      if (MOVEMENT_KEYS.has(key)) {
        event.preventDefault();
        keysRef.current.add(key);
      }

      if (INTERACTION_KEYS.has(key)) {
        event.preventDefault();

        if (!event.repeat) {
          pressedKeysRef.current.add(key);
        }
      }
    };

    const handleKeyUp = (event) => {
      const key = event.key.toLowerCase();

      // Always clear held keys, even if focus moved into a text field.
      keysRef.current.delete(key);
      pressedKeysRef.current.delete(key);
    };

    const handleBlur = () => {
      keysRef.current.clear();
      pressedKeysRef.current.clear();

      velocityRef.current = { x: 0, z: 0 };

      movement.current.moving = false;
      movement.current.running = false;
      movement.current.moveX = 0;
      movement.current.moveZ = 0;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    const initial = playerPosRef?.current;

    if (playerRef.current && initial) {
      playerRef.current.position.set(
        initial.x ?? 0,
        0,
        initial.z ?? 3
      );
    }
  }, [playerPosRef]);

  useEffect(() => {
    return () => {
      onInteractionPromptChange?.(null);
    };
  }, [onInteractionPromptChange]);

  useEffect(() => {
    const canvas = gl.domElement;
    const orbit = orbitRef.current;

    orbit.dragging = false;
    orbit.pointerId = null;
    orbit.initialized = false;

    if (cameraMode !== "orbit") {
      canvas.style.cursor = "";
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (event.button !== 0) return;

      orbit.dragging = true;
      orbit.pointerId = event.pointerId;
      canvas.setPointerCapture?.(event.pointerId);
      canvas.style.cursor = "grabbing";
      event.preventDefault();
    };

    const handlePointerMove = (event) => {
      if (!orbit.dragging || event.pointerId !== orbit.pointerId) {
        return;
      }

      orbit.yaw -= event.movementX * ORBIT_SENSITIVITY;
      orbit.pitch = THREE.MathUtils.clamp(
        orbit.pitch - event.movementY * ORBIT_SENSITIVITY,
        ORBIT_MIN_PITCH,
        ORBIT_MAX_PITCH
      );
      event.preventDefault();
    };

    const endDrag = (event) => {
      if (event.pointerId !== orbit.pointerId) return;

      canvas.releasePointerCapture?.(event.pointerId);
      orbit.dragging = false;
      orbit.pointerId = null;
      canvas.style.cursor = "grab";
    };

    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      canvas.style.cursor = "";
    };
  }, [cameraMode, gl]);

  useFrame((_, rawDelta) => {
    const player = playerRef.current;
    if (!player) return;

    const delta = Math.min(rawDelta, 0.05);
    const keys = keysRef.current;

    let inputX = 0;
    let inputZ = 0;

    if (keys.has("a") || keys.has("arrowleft")) inputX -= 1;
    if (keys.has("d") || keys.has("arrowright")) inputX += 1;
    if (keys.has("w") || keys.has("arrowup")) inputZ -= 1;
    if (keys.has("s") || keys.has("arrowdown")) inputZ += 1;

    const inputLength = Math.hypot(inputX, inputZ);

    if (inputLength > 0) {
      inputX /= inputLength;
      inputZ /= inputLength;
    }

    const wantsRun = keys.has("shift") && inputLength > 0;
    const maxSpeed = wantsRun ? RUN_SPEED : WALK_SPEED;

    const velocity = velocityRef.current;
    const rate = inputLength > 0 ? ACCELERATION : DECELERATION;
    const blend = 1 - Math.exp(-rate * delta);

    velocity.x += (inputX * maxSpeed - velocity.x) * blend;
    velocity.z += (inputZ * maxSpeed - velocity.z) * blend;

    let currentSpeed = Math.hypot(velocity.x, velocity.z);

    if (inputLength === 0 && currentSpeed < 0.05) {
      velocity.x = 0;
      velocity.z = 0;
      currentSpeed = 0;
    }

    const isMoving = currentSpeed > 0.15;

    movement.current.moving = isMoving;
    movement.current.running = wantsRun && isMoving;
    movement.current.moveX = isMoving ? velocity.x / currentSpeed : 0;
    movement.current.moveZ = isMoving ? velocity.z / currentSpeed : 0;

    if (isMoving) {
      movement.current.walkCycle +=
        delta * currentSpeed * (wantsRun ? 1 : 0.85);

      const targetRotation = Math.atan2(velocity.x, velocity.z);

      const rotationDifference =
        THREE.MathUtils.euclideanModulo(
          targetRotation - player.rotation.y + Math.PI,
          Math.PI * 2
        ) - Math.PI;

      player.rotation.y +=
        rotationDifference * Math.min(1, delta * ROTATION_SPEED);

      const currentX = player.position.x;
      const currentZ = player.position.z;

      const proposedX = currentX + velocity.x * delta;
      const proposedZ = currentZ + velocity.z * delta;

      const xResolved = resolveCollision(
        proposedX,
        currentZ,
        obstacles
      );

      const zResolved = resolveCollision(
        xResolved.x,
        proposedZ,
        obstacles
      );

      const bounded = constrainToWorld(
        zResolved.x,
        zResolved.z,
        safeWorldRadius
      );

      player.position.x = bounded.x;
      player.position.z = bounded.z;
    }

    const playerPosition = positionSnapshotRef.current;
    playerPosition.x = player.position.x;
    playerPosition.z = player.position.z;

    if (playerPosRef) {
      playerPosRef.current = playerPosition;
    }

    onPositionChange?.(playerPosition);

    interactionCheckTimerRef.current += delta;

    if (
      interactionCheckTimerRef.current >= INTERACTION_CHECK_INTERVAL
    ) {
      interactionCheckTimerRef.current = 0;

      const nearest = findNearestInteraction(
        player.position.x,
        player.position.z,
        interactionTargets
      );

      nearestInteractionRef.current = nearest?.target ?? null;

      const nextPrompt = nearest
        ? {
            id: nearest.target.id,
            type: nearest.target.type,
            label: nearest.target.label,
            key: String(nearest.target.key ?? "").toUpperCase(),
            distance: Number(nearest.distance.toFixed(1)),
          }
        : null;

      const nextPromptId = nextPrompt?.id ?? null;

      if (nextPromptId !== lastPromptIdRef.current) {
        lastPromptIdRef.current = nextPromptId;
        onInteractionPromptChange?.(nextPrompt);
      }
    }

    if (pressedKeysRef.current.size > 0) {
      const pressedKey = pressedKeysRef.current.values().next().value;
      pressedKeysRef.current.delete(pressedKey);

      const target = nearestInteractionRef.current;
      const targetKey = String(target?.key ?? "").toLowerCase();

      if (
        target &&
        targetKey === pressedKey &&
        typeof onPhysicalInteraction === "function"
      ) {
        onPhysicalInteraction(target.type, target);
      }
    }

    lookTarget.current.set(
      player.position.x,
      player.position.y + CAMERA_LOOK_HEIGHT,
      player.position.z
    );

    if (cameraMode === "orbit") {
      const orbit = orbitRef.current;

      if (!orbit.initialized) {
        const offset = camera.position.clone().sub(lookTarget.current);
        const distance = Math.max(offset.length(), 0.001);

        orbit.yaw = Math.atan2(offset.x, offset.z);
        orbit.pitch = THREE.MathUtils.clamp(
          Math.asin(offset.y / distance),
          ORBIT_MIN_PITCH,
          ORBIT_MAX_PITCH
        );
        orbit.initialized = true;
      }

      const horizontalDistance =
        ORBIT_DISTANCE * Math.cos(orbit.pitch);

      desiredCameraPosition.current.set(
        player.position.x + Math.sin(orbit.yaw) * horizontalDistance,
        lookTarget.current.y + Math.sin(orbit.pitch) * ORBIT_DISTANCE,
        player.position.z + Math.cos(orbit.yaw) * horizontalDistance
      );
    } else {
      desiredCameraPosition.current.set(
        player.position.x,
        player.position.y + CAMERA_HEIGHT,
        player.position.z + CAMERA_DISTANCE
      );
    }

    const smoothing = 1 - Math.exp(-CAMERA_SMOOTHING * delta);

    camera.position.lerp(
      desiredCameraPosition.current,
      smoothing
    );

    camera.lookAt(lookTarget.current);
  });

  return (
    <group ref={playerRef} position={[0, 0, 3]}>
      <AstronautModel
        height={1.9}
        getMovementState={() => movement.current}
      />
    </group>
  );
}

export default PlayerController;
