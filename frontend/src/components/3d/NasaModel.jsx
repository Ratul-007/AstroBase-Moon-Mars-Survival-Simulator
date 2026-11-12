
import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

export default function NasaModel({
  path,
  targetSize = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) {
  const { scene } = useGLTF(path);

  const model = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const originalBox = new THREE.Box3().setFromObject(clone);
    const originalSize = new THREE.Vector3();

    originalBox.getSize(originalSize);

    const maxDimension = Math.max(
      originalSize.x,
      originalSize.y,
      originalSize.z
    );

    if (maxDimension > 0) {
      const scale = targetSize / maxDimension;
      clone.scale.multiplyScalar(scale);
    }

    const scaledBox = new THREE.Box3().setFromObject(clone);
    const scaledCenter = new THREE.Vector3();

    scaledBox.getCenter(scaledCenter);

    // Center horizontally and place the bottom at ground level.
    clone.position.x -= scaledCenter.x;
    clone.position.z -= scaledCenter.z;
    clone.position.y -= scaledBox.min.y;

    return clone;
  }, [scene, targetSize]);

  return (
    <group position={position} rotation={rotation}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload("/models/nasa/acrimsat-a.glb");
useGLTF.preload("/models/nasa/crew-lock-bag.glb");
useGLTF.preload("/models/nasa/base-station.glb");
