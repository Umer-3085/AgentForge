import React, { useState } from "react";
import Head from "next/head";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";

// ─── Agent Config ─────────────────────────────────────────────────────────────
const AGENT_CONFIG = {
  CodeGen: { emoji: "⚡", role: "Code Generator", color: "#059669", cssVar: "var(--c-code)" },
  Security: { emoji: "🛡️", role: "Security Reviewer", color: "#dc2626", cssVar: "var(--c-security)" },
  Architect: { emoji: "📐", role: "Architecture Advisor", color: "#3b82f6", cssVar: "var(--c-architect)" },
  TestGen: { emoji: "🧪", role: "QA Engineer", color: "#f59e0b", cssVar: "var(--c-test)" },
  DocWriter: { emoji: "📄", role: "Documentation Specialist", color: "#a855f7", cssVar: "var(--c-doc)" },
};

const AGENT_ORDER = ["CodeGen", "Security", "Architect", "TestGen", "DocWriter"];

// ─── Output Tab Config ────────────────────────────────────────────────────────
const TABS = [
  { key: "refinedCode", label: "Refined Code", emoji: "🚀", dot: "#10b981" },
  { key: "securityReview", label: "Security", emoji: "🛡️", dot: "#f43f5e" },
  { key: "archReview", label: "Architecture", emoji: "📐", dot: "#3b82f6" },
  { key: "tests", label: "Tests", emoji: "🧪", dot: "#f59e0b" },
  { key: "docs", label: "Docs", emoji: "📄", dot: "#a855f7" },
  { key: "initialCode", label: "Initial Draft", emoji: "✍️", dot: "#94a3b8" },
];

// ─── Quick Templates ──────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    icon: "🔐",
    title: "JWT Authentication API",
    text: "Write a Node.js Express router for user sign-up and login using JWT tokens. Store passwords using bcrypt, validate all request inputs with express-validator, and include token verification middleware.",
  },
  {
    icon: "📦",
    title: "Paginated SQL Query Handler",
    text: "Create a Python service that queries a PostgreSQL database to retrieve users with search filters and cursor-based pagination. Protect against SQL injection and optimize the queries.",
  },
  {
    icon: "☁️",
    title: "S3 File Upload with Resizing",
    text: "Write a TypeScript AWS Lambda function that handles file uploads, validates MIME types, resizes image uploads to thumbnails using sharp, and stores them in AWS S3 with signed URLs.",
  },
  {
    icon: "💬",
    title: "Real-time Chat WebSocket",
    text: "Build a Node.js WebSocket server for real-time chat with rooms. Support user join/leave events, message broadcasting, rate limiting, and sanitize user input against XSS.",
  },
];

// ─── Markdown + Syntax Highlight Renderer ────────────────────────────────────
function MarkdownOutput({ content, label }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div>
      <div className="copy-bar">
        <button
          className={`btn-copy ${copied ? "copied" : ""}`}
          onClick={handleCopy}
          aria-label={copied ? `Copied ${label} content` : `Copy ${label} content`}
        >
          {copied ? "✓ Copied" : "⧉ Copy"}
        </button>
      </div>
      <div className="md">
        <ReactMarkdown
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              return !inline && match ? (
                <SyntaxHighlighter
                  style={oneLight}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    borderRadius: "10px",
                    border: "1px solid var(--hairline)",
                    padding: "18px",
                    background: "var(--surface)",
                    fontSize: "0.84rem",
                    fontFamily: "'JetBrains Mono', monospace",
                    lineHeight: 1.6,
                  }}
                  {...props}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>{children}</code>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

// ─── Individual Agent Card ────────────────────────────────────────────────────
function AgentCard({ agentKey, status, message }) {
  const cfg = AGENT_CONFIG[agentKey];

  return (
    <div
      className={`agent-card ${status}`}
      style={{ "--card-color": cfg.color }}
    >
      <div
        className="agent-avatar"
        style={{ background: `${cfg.color}18`, fontSize: "1.2rem" }}
      >
        {cfg.emoji}
      </div>
      <div className="agent-info">
        <div className="agent-name">{agentKey}</div>
        <div className="agent-role">{cfg.role}</div>
        {status === "thinking" && message && (
          <div className="agent-msg">{message}</div>
        )}
      </div>
      <div className={`status-chip ${status}`}>
        {status === "thinking" ? "Active" : status === "done" ? "Done" : "Idle"}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const [requirements, setRequirements] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const [activeTab, setActiveTab] = useState("refinedCode");

  const [agentStates, setAgentStates] = useState(() =>
    Object.fromEntries(AGENT_ORDER.map((k) => [k, { status: "idle", message: "" }]))
  );

  const [outputs, setOutputs] = useState({
    initialCode: "", securityReview: "", archReview: "",
    refinedCode: "", tests: "", docs: "",
  });

  const hasAnyOutput = Object.values(outputs).some(Boolean);

  // Map agent progress to percent
  const PROGRESS_MAP = {
    CodeGen_thinking: 10, CodeGen_done_initial: 20,
    Security_thinking: 30, Security_done: 45,
    Architect_thinking: 50, Architect_done: 60,
    CodeGen_thinking_refine: 65, CodeGen_done_refine: 75,
    TestGen_thinking: 80, TestGen_done: 88,
    DocWriter_thinking: 92, DocWriter_done: 100,
  };

  const setAgentStatus = (key, status, message = "") => {
    setAgentStates((prev) => ({ ...prev, [key]: { status, message } }));
  };

  const reset = () => {
    setAgentStates(Object.fromEntries(AGENT_ORDER.map((k) => [k, { status: "idle", message: "" }])));
    setOutputs({ initialCode: "", securityReview: "", archReview: "", refinedCode: "", tests: "", docs: "" });
    setProgressPct(0);
    setStatusMsg("");
    setErrorMsg("");
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!requirements.trim() || isLoading) return;

    setIsLoading(true);
    reset();
    setStatusMsg("Initializing multi-agent system...");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirements }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      // Track CodeGen call count for initial vs. refined distinction
      let codeGenCallCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let lastEvent = null;
        for (const line of lines) {
          const t = line.trim();
          if (t.startsWith("event:")) { lastEvent = t.slice(6).trim(); continue; }
          if (t.startsWith("data:") && lastEvent) {
            try {
              const data = JSON.parse(t.slice(5).trim());
              handleEvent(lastEvent, data, { codeGenCallCount, setCodeGenCallCount: (v) => { codeGenCallCount = v; } });
            } catch { }
            lastEvent = null;
          }
        }
      }
    } catch (err) {
      setErrorMsg(err.message);
      setStatusMsg("Generation failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEvent = (event, data, { codeGenCallCount, setCodeGenCallCount }) => {
    if (event === "status") {
      setStatusMsg(data.message);
    } else if (event === "progress") {
      const { agent, status, message, output } = data;
      setAgentStatus(agent, status, message);

      if (status === "thinking") setStatusMsg(message || `${agent} is working...`);
      if (status === "done") setStatusMsg(`${agent} completed.`);

      // Progress tracking
      if (agent === "CodeGen" && status === "thinking") {
        setProgressPct(codeGenCallCount === 0 ? 10 : 65);
      } else if (agent === "CodeGen" && status === "done") {
        setCodeGenCallCount(codeGenCallCount + 1);
        setProgressPct(codeGenCallCount === 0 ? 20 : 75);
      } else if (agent === "Security" && status === "thinking") setProgressPct(30);
      else if (agent === "Security" && status === "done") setProgressPct(45);
      else if (agent === "Architect" && status === "thinking") setProgressPct(50);
      else if (agent === "Architect" && status === "done") setProgressPct(62);
      else if (agent === "TestGen" && status === "thinking") setProgressPct(78);
      else if (agent === "TestGen" && status === "done") setProgressPct(88);
      else if (agent === "DocWriter" && status === "thinking") setProgressPct(92);
      else if (agent === "DocWriter" && status === "done") setProgressPct(100);

      // Store outputs as they arrive
      if (output && status === "done") {
        if (agent === "CodeGen") {
          setOutputs((prev) => {
            if (!prev.initialCode) {
              setActiveTab("refinedCode");
              return { ...prev, initialCode: output, refinedCode: output };
            }
            setActiveTab("refinedCode");
            return { ...prev, refinedCode: output };
          });
        } else if (agent === "Security") {
          setOutputs((p) => ({ ...p, securityReview: output }));
          setActiveTab("securityReview");
        } else if (agent === "Architect") {
          setOutputs((p) => ({ ...p, archReview: output }));
          setActiveTab("archReview");
        } else if (agent === "TestGen") {
          setOutputs((p) => ({ ...p, tests: output }));
          setActiveTab("tests");
        } else if (agent === "DocWriter") {
          setOutputs((p) => ({ ...p, docs: output }));
          setActiveTab("docs");
        }
      }
    } else if (event === "complete") {
      setOutputs({ ...data });
      setActiveTab("refinedCode");
      setProgressPct(100);
      setStatusMsg("✅ All agents completed successfully!");
      AGENT_ORDER.forEach((k) => setAgentStatus(k, "done"));
    } else if (event === "error") {
      setErrorMsg(data.message);
      setStatusMsg("Agent pipeline encountered an error.");
      // Reset all agents back to idle so the UI doesn't freeze
      setAgentStates(Object.fromEntries(AGENT_ORDER.map((k) => [k, { status: "idle", message: "" }])));
      setIsLoading(false);
    }
  };

  const completedAgents = Object.values(agentStates).filter((a) => a.status === "done").length;

  return (
    <>
      <Head>
        <title>Multi-Agent Code Review System | AI Agents Capstone</title>
        <meta name="description" content="Five specialized AI agents collaborate, review code, run security audits, and deliver a production-grade solution — autonomously." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚀</text></svg>" />
      </Head>

      {/* Top Navigation Bar */}
      <nav className="navbar" style={{ maxWidth: "1280px", margin: "0 auto", padding: "16px 24px" }}>
        <div className="nav-logo">
          <div className="nav-logo-icon">🚀</div>
          AgentForge
        </div>
        <div className="nav-badge">Kaggle Capstone 2026</div>
      </nav>

      <div className="container">
        {/* ─── Hero Header ─────────────────────────────────────────── */}
        <section className="hero">
          <div className="hero-eyebrow">
            <span>🏆</span> Kaggle AI Agents Capstone — Agents for Business
          </div>
          <h1 className="hero-title">
            Multi-Agent <span>Code Review</span><br />&amp; Synthesis
          </h1>
          <p className="hero-subtitle">
            Describe what you need built. Five specialized AI agents will collaborate,
            audit security, validate architecture, write tests, and deliver a
            production-ready result — autonomously.
          </p>
          <div className="concept-pills">
            <span className="pill">🤖 Multi-Agent ADK</span>
            <span className="pill">🔧 MCP Server</span>
            <span className="pill">🛡️ OWASP Security</span>
            <span className="pill">⚡ Critique Loop</span>
            <span className="pill">🚀 Vercel Deploy</span>
          </div>
        </section>

        {/* ─── App Grid ─────────────────────────────────────────────── */}
        <div className="app-grid">

          {/* LEFT: Input + Agent Pipeline */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Input Panel */}
            <div className="panel">
              <div className="section-label">Requirements</div>
              <div className="section-title">Describe what to build</div>
              <div className="section-desc">Agents will write code, audit security, review architecture, and produce tests.</div>

              <form onSubmit={handleGenerate}>
                <textarea
                  id="requirements-input"
                  className="textarea"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="e.g. Build a Node.js Express API with JWT auth, bcrypt password hashing, and rate limiting..."
                  disabled={isLoading}
                />
                <button id="generate-btn" type="submit" className="btn-primary" disabled={isLoading || !requirements.trim()} aria-label={isLoading ? "Orchestrating agents" : "Launch agent network"}>
                  {isLoading ? <><span className="spinner" /> Orchestrating Agents...</> : "⚡ Launch Agent Network"}
                </button>

                {/* Progress bar */}
                {(isLoading || hasAnyOutput) && (
                  <>
                    <div className="progress-bar-wrap mt-2">
                      <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
                    </div>
                    <div className="progress-label">{statusMsg}</div>
                  </>
                )}
                {/* Error banner */}
                {errorMsg && (
                  <div className="error-banner">
                    ⚠️ {errorMsg}
                  </div>
                )}
              </form>

              {/* Templates */}
              {!isLoading && (
                <>
                  <div className="divider" />
                  <div className="section-label" style={{ marginBottom: "10px" }}>Quick Templates</div>
                  {TEMPLATES.map((t, i) => (
                    <button key={i} className="template-btn" onClick={() => setRequirements(t.text)} aria-label={`Use template: ${t.title}`} title={t.text}>
                      <span className="template-icon">{t.icon}</span>
                      {t.title}
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* Agent Pipeline Panel */}
            <div className="panel">
              <div className="pipeline-header">
                <div>
                  <div className="section-label">Agent Pipeline</div>
                  <div className="section-title">Coordination Status</div>
                </div>
                {completedAgents > 0 && (
                  <div className="pipeline-step-count">{completedAgents}/{AGENT_ORDER.length} done</div>
                )}
              </div>

              {AGENT_ORDER.map((key) => (
                <AgentCard
                  key={key}
                  agentKey={key}
                  status={agentStates[key].status}
                  message={agentStates[key].message}
                />
              ))}
            </div>
          </div>

          {/* RIGHT: Output Area */}
          <div className="panel output-panel">
            {!hasAnyOutput ? (
              <div className="empty-state">
                <div className="empty-icon">🤖</div>
                <div className="empty-title">Workspace Ready</div>
                <div className="empty-desc">
                  Pick a quick template or paste your own requirements. The agent network will
                  produce code, a security audit, architecture review, tests, and documentation.
                </div>
                <div className="concept-pills mt-4">
                  {AGENT_ORDER.map((k) => (
                    <span key={k} className="pill" style={{ gap: "6px" }}>
                      <span>{AGENT_CONFIG[k].emoji}</span> {AGENT_CONFIG[k].role}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <nav className="tabs-bar">
                  {TABS.map((t) => (
                    <button
                      key={t.key}
                      className={`tab ${activeTab === t.key ? "active" : ""}`}
                      onClick={() => setActiveTab(t.key)}
                      disabled={!outputs[t.key]}
                      role="tab"
                      aria-selected={activeTab === t.key}
                      aria-label={`${t.label}${outputs[t.key] ? "" : " (not available)"}`}
                    >
                      <span
                        className="tab-dot"
                        style={{ background: outputs[t.key] ? t.dot : "var(--muted)" }}
                      />
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </nav>

                {/* Active tab content */}
                <div className="output-content">
                  {TABS.map((t) =>
                    activeTab === t.key && outputs[t.key] ? (
                      <MarkdownOutput key={t.key} content={outputs[t.key]} label={t.label} />
                    ) : null
                  )}
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </>
  );
}