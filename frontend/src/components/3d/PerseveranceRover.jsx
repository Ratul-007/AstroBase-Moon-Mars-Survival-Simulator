
import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_PATH = "/models/nasa/perseverance-rover.glb";
const TARGET_LENGTH = 1.8;

export default function PerseveranceRover() {
  const { scene } = useGLTF(MODEL_PATH);

  const roverModel = useMemo(() => {
    const model = scene.clone(true);

    model.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    bounds.getSize(size);
    bounds.getCenter(center);

    const horizontalLength = Math.max(size.x, size.z);

    if (horizontalLength > 0) {
      model.scale.multiplyScalar(
        TARGET_LENGTH / horizontalLength
      );
    }

    model.updateMatrixWorld(true);

    const normalizedBounds = new THREE.Box3().setFromObject(model);
    const normalizedCenter = new THREE.Vector3();

    normalizedBounds.getCenter(normalizedCenter);

    model.position.x -= normalizedCenter.x;
    model.position.y -= normalizedBounds.min.y;
    model.position.z -= normalizedCenter.z;

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return model;
  }, [scene]);

  return <primitive object={roverModel} />;
}

useGLTF.preload(MODEL_PATH);
