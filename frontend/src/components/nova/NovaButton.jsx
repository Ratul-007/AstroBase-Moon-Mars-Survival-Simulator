import { useDraggable } from "../../hooks/useDraggable"; // path ta tomar folder structure onujayi thik koro

function NovaButton({ onClick, unread = false }) {
  const { ref, style: dragStyle, handlers } = useDraggable("nova-fab-pos");

  // Mobile e default position ektu upore, jate Safe Zone chip er shathe overlap na hoy.
  // User drag korle shei position save hoye jabe.
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 620;

  return (
    <button
      ref={ref}
      {...handlers}
      onClick={onClick}
      style={{
        position: "fixed", // viewport er shathe clamp korar jonno absolute theke fixed
        right: "22px",
        bottom: isMobile ? "72px" : "22px",
        width: "64px",
        height: "64px",
        borderRadius: "50%",
        border: "none",
        cursor: "grab",
        background:
          "linear-gradient(135deg,#2563eb 0%,#38bdf8 100%)",
        boxShadow: "0 0 25px rgba(56,189,248,.45)",
        color: "white",
        fontSize: "26px",
        fontWeight: "700",
        zIndex: 50,
        // ".25s" (all) dile drag er shomoy left/top animate hoye lag korto
        transition: "transform .25s",
        userSelect: "none",
        WebkitUserSelect: "none",
        ...dragStyle, // drag korle left/top/right:auto/bottom:auto ekhane override kore
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
      title="Nova AI Companion (drag to move)"
      aria-label="Open Nova AI Companion"
    >
      ✦

      {unread && (
        <span
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: "#ef4444",
          }}
        />
      )}
    </button>
  );
}

export default NovaButton;