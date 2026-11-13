import { useRef, useState, useEffect } from "react";

export function useDraggable(storageKey = "nova-fab-pos") {
  const ref = useRef(null);
  const posRef = useRef(null);
  const drag = useRef({ active: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const [pos, setPos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || null;
    } catch {
      return null;
    }
  });
  posRef.current = pos;

  const clamp = (x, y) => {
    const el = ref.current;
    const w = el?.offsetWidth || 56;
    const h = el?.offsetHeight || 56;
    return {
      x: Math.min(Math.max(8, x), window.innerWidth - w - 8),
      y: Math.min(Math.max(8, y), window.innerHeight - h - 8),
    };
  };

  // Screen rotate / resize hole button jate bairey na jai
  useEffect(() => {
    const fix = () =>
      posRef.current && setPos(clamp(posRef.current.x, posRef.current.y));
    window.addEventListener("resize", fix);
    return () => window.removeEventListener("resize", fix);
  }, []);

  const onPointerDown = (e) => {
    const r = ref.current.getBoundingClientRect();
    drag.current = {
      active: true,
      moved: false,
      sx: e.clientX,
      sy: e.clientY,
      ox: r.left,
      oy: r.top,
    };
    ref.current.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 6) return; // choto nora = click
    d.moved = true;
    setPos(clamp(d.ox + dx, d.oy + dy));
  };

  const onPointerUp = (e) => {
    drag.current.active = false;
    ref.current?.releasePointerCapture?.(e.pointerId);
    if (drag.current.moved && posRef.current) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(posRef.current));
      } catch {
        /* ignore */
      }
    }
  };

  // Drag er por click hole Nova panel jeno khule na jai
  const onClickCapture = (e) => {
    if (drag.current.moved) {
      e.stopPropagation();
      e.preventDefault();
      drag.current.moved = false;
    }
  };

  const style = {
    touchAction: "none",
    ...(pos ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" } : {}),
  };

  return {
    ref,
    style,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onClickCapture,
    },
  };
}