
import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";

function MissionCertificate({
  playerName,
  missionName,
  days,
  stats = {},
}) {
  const certificateRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState("");

  const safeName = (playerName || "Astronaut")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "_");

  const resources = [
    { label: "POWER", value: stats.power },
    { label: "WATER", value: stats.water },
    { label: "FOOD", value: stats.food },
    { label: "OXYGEN", value: stats.oxygen },
  ];

  const captureCertificate = async () => {
    if (!certificateRef.current) {
      throw new Error("Certificate preview is not available.");
    }

    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    return html2canvas(certificateRef.current, {
      scale: 3,
      backgroundColor: "#060B19",
      useCORS: true,
      logging: false,
      width: 1000,
      windowWidth: 1100,
      scrollX: 0,
      scrollY: 0,
    });
  };

  const canvasToBlob = (canvas) =>
    new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error("Could not create certificate image."));
          }
        },
        "image/png"
      );
    });

  const downloadCertificate = async () => {
    setError("");
    setIsDownloading(true);

    try {
      const canvas = await captureCertificate();
      const blob = await canvasToBlob(canvas);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `AstroBase_Certificate_${safeName}.png`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (downloadError) {
      console.error("Certificate download failed:", downloadError);

      setError(
        "Download failed. Please try again or use your browser's screenshot feature."
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const shareCertificate = async () => {
    setError("");

    if (!navigator.share) {
      setError(
        "Image sharing is not supported in this browser. Please download the certificate instead."
      );
      return;
    }

    setIsSharing(true);

    try {
      const canvas = await captureCertificate();
      const blob = await canvasToBlob(canvas);

      const file = new File(
        [blob],
        `AstroBase_Certificate_${safeName}.png`,
        { type: "image/png" }
      );

      if (
        navigator.canShare &&
        !navigator.canShare({ files: [file] })
      ) {
        setError(
          "Your browser cannot share image files directly. Please download the certificate."
        );
        return;
      }

      await navigator.share({
        title: "AstroBase Mission Certificate",
        text: `${playerName} completed ${missionName} in the AstroBase Moon & Mars Survival Simulator.`,
        files: [file],
      });
    } catch (shareError) {
      if (shareError?.name !== "AbortError") {
        console.error("Certificate sharing failed:", shareError);

        setError(
          "Sharing failed. You can still download your certificate."
        );
      }
    } finally {
      setIsSharing(false);
    }
  };

  const resourceValue = (value) => {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return "N/A";
    }

    const number = Number(value);

    return Number.isFinite(number) ? `${number}%` : "N/A";
  };

  const statCardStyle = {
    flex: "1 1 150px",
    minWidth: 0,
    padding: "18px 10px",
    border: "1px solid #354665",
    borderRadius: "10px",
    background: "linear-gradient(145deg, #172640, #101a2e)",
  };

  return (
    <div style={{ width: "100%", color: "#eef4ff" }}>
      <div
        style={{
          width: "100%",
          overflowX: "auto",
          padding: "8px 0",
        }}
      >
        <div
          ref={certificateRef}
          style={{
            boxSizing: "border-box",
            width: "1000px",
            minHeight: "700px",
            padding: "48px",
            margin: "0 auto",
            position: "relative",
            overflow: "hidden",
            background:
              "radial-gradient(ellipse at top, #182b49 0%, #0a1326 48%, #060B19 100%)",
            border: "3px solid #c49a43",
            outline: "1px solid #70572d",
            outlineOffset: "-12px",
            color: "#f8fafc",
            textAlign: "center",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "20px",
              border: "1px solid rgba(252, 211, 77, 0.24)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: "38px", marginBottom: "6px" }}>
              🚀
            </div>

            <div
              style={{
                fontSize: "15px",
                letterSpacing: "5px",
                color: "#cbd5e1",
              }}
            >
              ASTROBASE MISSION OPERATIONS
            </div>

            <h1
              style={{
                color: "#FCD34D",
                fontSize: "39px",
                letterSpacing: "7px",
                margin: "12px 0",
              }}
            >
              ASTROBASE
            </h1>

            <div
              style={{
                width: "140px",
                height: "2px",
                background: "#c49a43",
                margin: "18px auto",
              }}
            />

            <h2
              style={{
                fontSize: "26px",
                letterSpacing: "3px",
                margin: "20px 0 12px",
              }}
            >
              CERTIFICATE OF MISSION COMPLETION
            </h2>

            <p
              style={{
                color: "#cbd5e1",
                fontSize: "17px",
                marginTop: "28px",
              }}
            >
              This certifies that
            </p>

            <h2
              style={{
                color: "#FCD34D",
                fontSize: "42px",
                overflowWrap: "anywhere",
                margin: "12px 0",
              }}
            >
              {playerName}
            </h2>

            <p style={{ fontSize: "17px", color: "#dbeafe" }}>
              has successfully completed the mission
            </p>

            <h2
              style={{
                fontSize: "29px",
                color: "#ffffff",
                margin: "15px 0 8px",
              }}
            >
              {missionName}
            </h2>

            <div
              style={{
                fontSize: "21px",
                color: "#FCD34D",
                fontWeight: "bold",
              }}
            >
              {days} DAYS SURVIVED
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "12px",
                flexWrap: "wrap",
                marginTop: "35px",
              }}
            >
              {resources.map((item) => (
                <div key={item.label} style={statCardStyle}>
                  <div
                    style={{
                      color: "#cbd5e1",
                      fontSize: "12px",
                      letterSpacing: "2px",
                    }}
                  >
                    {item.label}
                  </div>

                  <div
                    style={{
                      fontSize: "26px",
                      fontWeight: "bold",
                      color: "#FCD34D",
                      marginTop: "8px",
                    }}
                  >
                    {resourceValue(item.value)}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "30px",
                flexWrap: "wrap",
                marginTop: "24px",
                color: "#dbeafe",
                fontSize: "15px",
              }}
            >
              {stats.score !== undefined &&
                stats.score !== null &&
                stats.score !== "" &&
                Number.isFinite(Number(stats.score)) && (
                  <div>
                    FINAL SCORE:{" "}
                    <strong style={{ color: "#FCD34D" }}>
                      {stats.score}
                    </strong>
                  </div>
                )}

              {stats.objectivesCompleted !== undefined &&
                stats.objectivesCompleted !== null &&
                stats.objectivesCompleted !== "" &&
                Number.isFinite(Number(stats.objectivesCompleted)) && (
                  <div>
                    OBJECTIVES:{" "}
                    <strong style={{ color: "#FCD34D" }}>
                      {stats.objectivesCompleted}
                    </strong>
                  </div>
                )}
            </div>

            <div
              style={{
                height: "1px",
                background: "#354665",
                margin: "35px 0 22px",
              }}
            />

            <div style={{ fontSize: "15px", color: "#cbd5e1" }}>
              Developed by{" "}
              <strong style={{ color: "#FCD34D" }}>
                Team: 404: Earth Not Found
              </strong>
            </div>

            <div
              style={{
                marginTop: "8px",
                fontSize: "15px",
                color: "#cbd5e1",
              }}
            >
              NASA Space Apps Challenge 2026
            </div>

            <div
              style={{
                marginTop: "12px",
                fontSize: "11px",
                letterSpacing: "2px",
                color: "#8192ae",
              }}
            >
              MOON & MARS SURVIVAL SIMULATOR
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginTop: "20px",
        }}
      >
        <button
          type="button"
          onClick={downloadCertificate}
          disabled={isDownloading || isSharing}
          style={{
            padding: "13px 20px",
            border: "none",
            borderRadius: "9px",
            background: "#FCD34D",
            color: "#101827",
            fontWeight: "bold",
            cursor: isDownloading ? "wait" : "pointer",
            opacity: isDownloading || isSharing ? 0.7 : 1,
          }}
        >
          {isDownloading
            ? "Preparing PNG..."
            : "⬇ Download Certificate"}
        </button>

        <button
          type="button"
          onClick={shareCertificate}
          disabled={isDownloading || isSharing}
          style={{
            padding: "13px 20px",
            border: "1px solid #64748b",
            borderRadius: "9px",
            background: "#172640",
            color: "#eef4ff",
            fontWeight: "bold",
            cursor: isSharing ? "wait" : "pointer",
            opacity: isDownloading || isSharing ? 0.7 : 1,
          }}
        >
          {isSharing
            ? "Preparing to share..."
            : "↗ Share Certificate"}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          style={{
            marginTop: "14px",
            color: "#fca5a5",
            textAlign: "center",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default MissionCertificate;
