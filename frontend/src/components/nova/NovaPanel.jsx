
import { useState } from "react";
import { useMissionSession } from "../MissionSessionContext";

function getSourceUrl(link) {
  if (typeof link === "string") {
    return link;
  }

  if (link && typeof link === "object") {
    const url = link.uri || link.url || link.href;

    if (typeof url === "string") {
      return url;
    }
  }

  return null;
}

function NovaPanel({ planet = "moon", survivalState, onClose }) {
  const { mission, taskStepIndex } = useMissionSession();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: `Hello, astronaut! I'm Nova, your ${
        planet === "mars" ? "Mars" : "Moon"
      } mission companion. Ask me a question about your mission or space.`,
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const question = input.trim();

    if (!question || loading) return;

    if (question.length > 300) {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: "Please keep your question within 300 characters.",
        },
      ]);
      return;
    }

    const previousMessages = messages;

    setMessages((previous) => [
      ...previous,
      { role: "user", text: question },
    ]);

    setInput("");
    setLoading(true);

    try {
      const history = previousMessages
        .filter(
          (item) =>
            item.role === "user" || item.role === "assistant"
        )
        .slice(-8)
        .map((item) => ({
          role: item.role,
          content: item.text,
        }));

      const response = await fetch("/api/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `[Current mission: ${
            planet === "mars" ? "Mars" : "Moon"
          }] ${question}`,
          history,
          state: {
            mission: mission.environment,
            campaignDays: mission.duration,
            day: mission.day,
            score: mission.score,
            resources: mission.resources,
            objectives: {
              total: mission.objectives.length,
              done: mission.objectives.filter((objective) => objective.completed).length,
            },
            missionStatus: mission.missionStatus,
            currentEvent: mission.currentEvent,
            resolvedEventIds: mission.resolvedEventIds,
            eventCount: mission.eventCount,
            log: mission.log,
            taskProgress: {
              eventId: mission.currentEvent?.id ?? null,
              stepIndex: taskStepIndex,
            },
            survival: survivalState,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `Request failed (${response.status})`
        );
      }

      const reply =
        typeof data.reply === "string" && data.reply.trim()
          ? data.reply
          : "I couldn't generate a reply. Please try again.";

      const sourceUrl = getSourceUrl(data.link);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: reply,
          source: data.source,
          link: sourceUrl,
        },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: `I couldn't connect to Nova's backend. Please check that the backend is running and try again. Details: ${error.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const panelStyle = {
    position: "fixed",
    right: "24px",
    bottom: "96px",
    width: "min(370px, calc(100vw - 32px))",
    height: "min(520px, calc(100vh - 130px))",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "#0b1427",
    color: "#eef4ff",
    border: "1px solid #38bdf8",
    borderRadius: "16px",
    boxShadow: "0 16px 48px rgba(0, 0, 0, 0.55)",
    zIndex: 1100,
  };

  return (
    <section
      role="dialog"
      aria-label="Nova AI Companion chat"
      style={panelStyle}
    >
      <header
        style={{
          padding: "16px",
          background: "#101d36",
          borderBottom: "1px solid #263b59",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div>
          <strong style={{ color: "#7dd3fc", fontSize: "16px" }}>
            ✦ NOVA
          </strong>

          <div
            style={{
              fontSize: "12px",
              color: "#94a3b8",
              marginTop: "4px",
            }}
          >
            {planet === "mars" ? "MARS" : "MOON"} MISSION COMPANION
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close Nova chat"
          style={{
            background: "transparent",
            border: "1px solid #475569",
            borderRadius: "8px",
            color: "#eef4ff",
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </header>

      <div
        aria-live="polite"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {messages.map((message, index) => (
          <div
            key={`${index}-${message.role}`}
            style={{
              alignSelf:
                message.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "90%",
              padding: "10px 12px",
              borderRadius: "12px",
              background:
                message.role === "user" ? "#164e80" : "#17263d",
              border:
                message.role === "user"
                  ? "1px solid #2563eb"
                  : "1px solid #2d415d",
              fontSize: "13px",
              lineHeight: 1.6,
              overflowWrap: "anywhere",
              whiteSpace: "pre-wrap",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#7dd3fc",
                marginBottom: "4px",
              }}
            >
              {message.role === "user" ? "YOU" : "NOVA"}
            </div>

            {message.text}

            {message.source && (
              <div
                style={{
                  marginTop: "8px",
                  color: "#94a3b8",
                  fontSize: "11px",
                }}
              >
                Source:{" "}
                {typeof message.source === "string"
                  ? message.source
                  : "External reference"}
              </div>
            )}

            {message.link && (
              <div style={{ marginTop: "8px" }}>
                <a
                  href={message.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#7dd3fc" }}
                >
                  View source ↗
                </a>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div
            style={{
              color: "#7dd3fc",
              fontSize: "13px",
            }}
          >
            Nova is thinking...
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          padding: "12px",
          display: "flex",
          gap: "8px",
          borderTop: "1px solid #263b59",
          background: "#101d36",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => event.stopPropagation()}
          onKeyUp={(event) => event.stopPropagation()}
          onKeyPress={(event) => event.stopPropagation()}
          placeholder="Ask Nova a question..."
          aria-label="Message Nova"
          maxLength={300}
          disabled={loading}
          autoComplete="off"
          style={{
            minWidth: 0,
            flex: 1,
            padding: "11px",
            borderRadius: "9px",
            border: "1px solid #475569",
            background: "#070d1a",
            color: "#eef4ff",
            outline: "none",
            fontSize: "14px",
          }}
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: "10px 12px",
            border: "none",
            borderRadius: "9px",
            background:
              loading || !input.trim() ? "#334155" : "#0284c7",
            color: "#ffffff",
            fontWeight: 600,
            cursor:
              loading || !input.trim() ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "..." : "Send"}
        </button>
      </form>
    </section>
  );
}

export default NovaPanel;
