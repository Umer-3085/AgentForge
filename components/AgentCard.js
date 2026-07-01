import React from "react";

export default function AgentCard({ name, role, status, message, color }) {
  const getInitials = (n) => {
    if (n === "DocWriter") return "DW";
    if (n === "CodeGen") return "CG";
    if (n === "TestGen") return "TG";
    return n.substring(0, 2).toUpperCase();
  };

  const getStatusText = (s) => {
    switch (s) {
      case "thinking":
        return "Thinking";
      case "done":
        return "Done";
      default:
        return "Idle";
    }
  };

  const initials = getInitials(name);
  const statusText = getStatusText(status);

  return (
    <div className={`agent-status-card ${status === "thinking" ? "active" : ""}`}>
      <div
        className="agent-icon"
        style={{
          background: color,
          boxShadow: status === "thinking" ? `0 0 15px ${color}80` : "none",
        }}
      >
        {initials}
      </div>
      <div className="agent-info">
        <div className="agent-name">{name}</div>
        <div className="agent-role">{role}</div>
        {message && status === "thinking" && (
          <div
            style={{
              fontSize: "0.75rem",
              color: "#a5b4fc",
              marginTop: "4px",
              lineHeight: 1.3,
            }}
          >
            {message}
          </div>
        )}
      </div>
      <div className={`status-badge ${status}`}>{statusText}</div>
    </div>
  );
}
