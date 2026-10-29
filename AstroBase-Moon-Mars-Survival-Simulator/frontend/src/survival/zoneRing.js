import * as THREE from "three";

/**
 * Visible safe-zone boundary: a glowing ring on the ground plus a faint wall.
 * Turns red when the player is outside.
 *
 *   const zone = createZoneRing({ radius: 25, center: { x: 0, z: 0 } });
 *   scene.add(zone.object);
 *   // every frame:
 *   const s = survival.simRef.current;
 *   zone.update(s.radius, s.inZone, clock.elapsedTime);
 *   // on cleanup:
 *   scene.remove(zone.object); zone.dispose();
 */
export function createZoneRing({
  radius = 25,
  center = { x: 0, z: 0 },
  groundY = 0.05,       // raise this if the ring is hidden inside terrain
  wallHeight = 6,
  safeColor = 0x38bdf8,
  dangerColor = 0xef4444,
} = {}) {
  const group = new THREE.Group();
  group.position.set(center.x, 0, center.z);

  const ringMat = new THREE.MeshBasicMaterial({
    color: safeColor,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ringGeo = new THREE.RingGeometry(0.985, 1, 128);
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = groundY;

  const wallMat = new THREE.MeshBasicMaterial({
    color: safeColor,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const wallGeo = new THREE.CylinderGeometry(1, 1, wallHeight, 128, 1, true);
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.y = wallHeight / 2;

  group.add(ring, wall);
  group.scale.set(radius, 1, radius); // only X/Z scale, so wall height stays fixed

  const tmp = new THREE.Color();

  function update(currentRadius, inZone, time = 0) {
    group.scale.set(currentRadius, 1, currentRadius);
    tmp.setHex(inZone ? safeColor : dangerColor);
    ringMat.color.copy(tmp);
    wallMat.color.copy(tmp);
    wallMat.opacity = (inZone ? 0.08 : 0.16) + 0.04 * Math.sin(time * 2.5);
  }

  function dispose() {
    ringGeo.dispose();
    wallGeo.dispose();
    ringMat.dispose();
    wallMat.dispose();
  }

  return { object: group, update, dispose };
}