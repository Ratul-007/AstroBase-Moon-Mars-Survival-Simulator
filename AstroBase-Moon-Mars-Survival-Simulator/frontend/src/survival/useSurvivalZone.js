
import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULTS = {
  center: { x: 0, z: 0 },
  radius: 25,
  graceSeconds: 2,
  oxygenDrainOutside: 4,
  oxygenRefillInside: 8,
  healthDrainNoOxygen: 6,
  healthRegenInside: 1,
  onFail: null,
};

function toStatus(state) {
  if (state.failed) return "failed";
  if (state.inZone) return "safe";
  if (state.oxygen <= 0) return "critical";
  return "danger";
}

function snapshot(state) {
  return {
    oxygen: state.oxygen,
    health: state.health,
    radius: state.radius,
    inZone: state.inZone,
    failed: state.failed,
    distToEdge: state.dist - state.radius,
    status: toStatus(state),
  };
}

export function useSurvivalZone(getPlayerPos, options = {}) {
  const cfgRef = useRef({ ...DEFAULTS, ...options });
  cfgRef.current = {
    ...cfgRef.current,
    ...options,
    center: {
      ...cfgRef.current.center,
      ...(options.center || {}),
    },
  };

  const getPosRef = useRef(getPlayerPos);
  getPosRef.current = getPlayerPos;

  const simRef = useRef({
    oxygen: 100,
    health: 100,
    radius: options.radius ?? DEFAULTS.radius,
    targetRadius: options.radius ?? DEFAULTS.radius,
    shrinkSpeed: 0,
    outsideTime: 0,
    dist: 0,
    inZone: true,
    failed: false,
    paused: false,
  });

  const [ui, setUi] = useState(() => snapshot(simRef.current));

  useEffect(() => {
    let rafId;
    let lastTime = null;
    let uiAccumulator = 0;

    const step = (dt) => {
      const state = simRef.current;
      const config = cfgRef.current;

      if (state.failed || state.paused) return;

      // Gradually move the safe-zone boundary to its target radius.
      if (state.radius !== state.targetRadius) {
        const difference = state.targetRadius - state.radius;
        const movement = state.shrinkSpeed * dt;

        state.radius =
          Math.abs(difference) <= movement
            ? state.targetRadius
            : state.radius + Math.sign(difference) * movement;
      }

      const position = getPosRef.current?.();

      if (
        !position ||
        !Number.isFinite(position.x) ||
        !Number.isFinite(position.z)
      ) {
        return;
      }

      const center = config.center || DEFAULTS.center;

      state.dist = Math.hypot(
        position.x - center.x,
        position.z - center.z
      );

      state.inZone = state.dist <= state.radius;

      if (state.inZone) {
        state.outsideTime = 0;

        state.oxygen = Math.min(
          100,
          state.oxygen + config.oxygenRefillInside * dt
        );

        if (state.oxygen > 50) {
          state.health = Math.min(
            100,
            state.health + config.healthRegenInside * dt
          );
        }
      } else {
        state.outsideTime += dt;

        if (state.outsideTime > config.graceSeconds) {
          state.oxygen = Math.max(
            0,
            state.oxygen - config.oxygenDrainOutside * dt
          );
        }

        if (state.oxygen <= 0) {
          state.health = Math.max(
            0,
            state.health - config.healthDrainNoOxygen * dt
          );
        }
      }

      if (state.health <= 0 && !state.failed) {
        state.failed = true;
        config.onFail?.(
          "The astronaut ran out of oxygen outside the safe zone."
        );
      }
    };

    const loop = (now) => {
      if (lastTime === null) lastTime = now;

      // Clamp frame time so a tab switch does not cause a huge resource loss.
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      step(dt);

      uiAccumulator += dt;

      // Refresh the React HUD around 10 times per second.
      if (uiAccumulator >= 0.1) {
        uiAccumulator = 0;
        setUi(snapshot(simRef.current));
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);

  const shrinkZone = useCallback((newRadius, seconds = 5) => {
    if (!Number.isFinite(newRadius) || newRadius <= 0) return;

    const state = simRef.current;
    state.targetRadius = newRadius;
    state.shrinkSpeed =
      Math.abs(newRadius - state.radius) / Math.max(seconds, 0.01);
  }, []);

  const addOxygen = useCallback((amount) => {
    if (!Number.isFinite(amount)) return;

    const state = simRef.current;
    state.oxygen = Math.min(100, Math.max(0, state.oxygen + amount));
    setUi(snapshot(state));
  }, []);

  const damage = useCallback((amount) => {
    if (!Number.isFinite(amount) || amount < 0) return;

    const state = simRef.current;
    state.health = Math.max(0, state.health - amount);

    if (state.health <= 0 && !state.failed) {
      state.failed = true;
      cfgRef.current.onFail?.(
        "The astronaut's health reached zero."
      );
    }

    setUi(snapshot(state));
  }, []);

  const setPaused = useCallback((paused) => {
    simRef.current.paused = Boolean(paused);
    setUi(snapshot(simRef.current));
  }, []);

  const reset = useCallback(() => {
    const config = cfgRef.current;
    const state = simRef.current;

    Object.assign(state, {
      oxygen: 100,
      health: 100,
      radius: config.radius,
      targetRadius: config.radius,
      shrinkSpeed: 0,
      outsideTime: 0,
      dist: 0,
      inZone: true,
      failed: false,
      paused: false,
    });

    setUi(snapshot(state));
  }, []);

  return {
    ...ui,
    simRef,
    shrinkZone,
    addOxygen,
    damage,
    setPaused,
    reset,
  };
}
