
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";

const MODEL_PATH =
  "/models/animated-astronaut-character-in-space-suit-loop.glb";

function findAnimation(clips, keywords) {
  return clips.find((clip) =>
    keywords.some((keyword) =>
      clip.name.toLowerCase().includes(keyword)
    )
  );
}

function stabilizeBackpackTracks(clips) {
  return (clips || []).map((clip) => {
    const tracks = clip.tracks.filter(
      (track) => !/(?:bagPack|bagPackHandle)/i.test(track.name)
    );

    return tracks.length === clip.tracks.length
      ? clip
      : new THREE.AnimationClip(clip.name, clip.duration, tracks);
  });
}

function AstronautModel({
  height = 1.9,
  moving = false,
  running = false,
  getMovementState,
}) {
  const groupRef = useRef(null);
  const activeActionRef = useRef(null);
  const lastMovementRef = useRef(null);

  const { scene, animations: sourceAnimations } = useGLTF(MODEL_PATH);
  const animations = useMemo(
    () => stabilizeBackpackTracks(sourceAnimations),
    [sourceAnimations]
  );

  // Clone the scene so its skeleton can be animated independently.
  const model = useMemo(
    () => cloneSkeleton(scene),
    [scene]
  );

  // Automatically scale the model to the requested character height.
  const modelScale = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    bounds.getSize(size);

    if (!Number.isFinite(size.y) || size.y <= 0) {
      return 1;
    }

    return height / size.y;
  }, [model, height]);

  const { actions, mixer } = useAnimations(animations, model);

  const animationSet = useMemo(() => {
    const clips = animations || [];

    const idleClip = findAnimation(clips, [
      "idle",
      "standing",
      "stand",
      "breathing",
    ]);

    const walkClip = findAnimation(clips, [
      "walk",
      "walking",
      "locomotion",
    ]);

    const runClip = findAnimation(clips, [
      "run",
      "running",
      "sprint",
    ]);

    // If the model only has one animation, use it for movement.
    const fallbackMovement =
      walkClip || runClip || (clips.length === 1 ? clips[0] : null);

    return {
      idle: idleClip ? actions[idleClip.name] : null,
      walk: walkClip
        ? actions[walkClip.name]
        : fallbackMovement
          ? actions[fallbackMovement.name]
          : null,
      run: runClip
        ? actions[runClip.name]
        : fallbackMovement
          ? actions[fallbackMovement.name]
          : null,
    };
  }, [actions, animations]);

  useEffect(() => {
    model.traverse((object) => {
      if (!object.isMesh) return;

      object.castShadow = true;
      object.receiveShadow = false;

      // Keep the original model materials and textures.
      if (object.material) {
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        materials.forEach((material) => {
          material.needsUpdate = true;
        });
      }
    });
  }, [model]);

  useEffect(() => {
    return () => {
      mixer.stopAllAction();
    };
  }, [mixer]);

  useFrame((_, delta) => {
    const movement =
      typeof getMovementState === "function"
        ? getMovementState() || {}
        : { moving, running };

    const isMoving = Boolean(movement.moving);
    const isRunning = isMoving && Boolean(movement.running);

    let nextAction = null;

    if (isMoving) {
      nextAction = isRunning
        ? animationSet.run || animationSet.walk
        : animationSet.walk || animationSet.run;
    } else {
      nextAction = animationSet.idle;
    }

    // Change animations only when the movement state changes.
    if (lastMovementRef.current !== nextAction) {
      const previousAction = activeActionRef.current;

      if (nextAction) {
        nextAction.enabled = true;
        nextAction.setEffectiveTimeScale(isRunning ? 1.25 : 1);
        nextAction.setEffectiveWeight(1);
        nextAction.reset();
        nextAction.play();

        if (previousAction && previousAction !== nextAction) {
          nextAction.crossFadeFrom(previousAction, 0.2, true);
        } else if (!previousAction) {
          nextAction.fadeIn(0.2);
        }
      } else if (previousAction) {
        // No idle clip? Stop the movement animation when standing.
        previousAction.fadeOut(0.15);
      }

      activeActionRef.current = nextAction;
      lastMovementRef.current = nextAction;
    }

    // Update the model's animation mixer every frame.
    mixer.update(Math.min(delta, 0.05));
  });

  return (
    <group ref={groupRef} scale={modelScale}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload(MODEL_PATH);

export default AstronautModel;
