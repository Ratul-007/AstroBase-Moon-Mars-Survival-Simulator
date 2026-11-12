
import { forwardRef, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Vector3 } from "three";

const MODEL_PATH = "/models/nasa/Saturn-V.glb";
const TARGET_HEIGHT = 8;

const Rocket = forwardRef(function Rocket({ flameRef }, ref) {
  const { scene } = useGLTF(MODEL_PATH);

  // Create an independent model instance and normalize its size.
  // The model's bottom is placed at y = 0, matching the old rocket.
  const rocketModel = useMemo(() => {
    const model = scene.clone(true);

    model.updateMatrixWorld(true);

    const initialBounds = new Box3().setFromObject(model);
    const initialSize = new Vector3();
    initialBounds.getSize(initialSize);
    const initialCenter = new Vector3();
    initialBounds.getCenter(initialCenter);

    const scale = initialSize.y > 0 ? TARGET_HEIGHT / initialSize.y : 1;
    if (initialSize.y > 0) {
      model.scale.multiplyScalar(scale);
    }
    // Center the rocket horizontally and place its base on y = 0.
    model.position.set(
      -initialCenter.x * scale,
      -initialBounds.min.y * scale,
      -initialCenter.z * scale
    );

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return model;
  }, [scene]);

  return (
    <group ref={ref}>
      {/* NASA Saturn V GLB */}
      <primitive object={rocketModel} />

      {/* Existing flame animation interface preserved.
          The flame group's origin remains near the rocket base. */}
      <group ref={flameRef} position={[0, -0.35, 0]} visible={false}>
        <mesh position={[0, -1.3, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.55, 2.6, 18]} />
          <meshBasicMaterial
            color="#ff8a2a"
            transparent
            opacity={0.85}
            depthWrite={false}
          />
        </mesh>

        <mesh position={[0, -0.95, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.3, 1.9, 14]} />
          <meshBasicMaterial
            color="#fff2b0"
            transparent
            opacity={0.95}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
});

useGLTF.preload(MODEL_PATH);

export default Rocket;
