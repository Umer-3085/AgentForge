# 🔥 AgentForge — Multi-Agent Code Review & Synthesis System

A production-grade, collaborative software engineering assistant built for the **AI Agents: Intensive Vibe Coding Capstone Project (Freestyle Track)**.

AgentForge deploys a network of five specialized AI agents that review, critique, and co-develop software requirements. It showcases real-time agent coordination, OWASP-based security audits, an automated MCP static analysis tool, and a critique-and-refine loop — outputting a fully tested and documented codebase from a plain-English requirement.

---

## 📖 Table of Contents
1. [Core Features](#-core-features)
2. [Orchestration Architecture](#-orchestration-architecture)
3. [Course Concepts Demonstrated](#-course-concepts-demonstrated)
4. [Project Structure](#-project-structure)
5. [Getting Started & Setup](#%EF%B8%8F-getting-started--setup)
6. [Security & Compliance](#-security--compliance)
7. [Vercel Deployment Guide](#-vercel-deployment-guide)

---

## 🌟 Core Features

- **Multi-Agent Orchestration**: Autonomous, sequential agent pipelines coordinating through shared execution memory.
- **Critique & Refinement Loop**: The **Code Generator** updates its initial codebase in response to reviews from the **Security** and **Architecture** agents.
- **Real-time Stream Pipeline**: Built with Server-Sent Events (SSE) to stream live progress from individual agents straight to a modern, dark-themed dashboard.
- **OWASP-based Audits**: The Security Agent grades code against key secure coding criteria and vulnerability lists.
- **Interactive Suggestion Cards**: Quick-start templates to test the system immediately on standard scenarios.

---

## 📐 Orchestration Architecture

```
 User Input (Plain English Requirement)
                     │
                     ▼
             ┌───────────────┐
             │  Orchestrator │ ◄── [Server-Sent Events] ──► Dashboard UI
             └───────┬───────┘
                     │
           (1) Spawn CodeGen
                     │
                     ▼
             [CodeGen Agent] (Initial Draft)
                     │
          ┌──────────┴──────────┐
          ▼ (2)                 ▼ (3)
   [Security Agent]      [Architect Agent]
  (Vulnerability Scan)  (Scalability Check)
          └──────────┬──────────┘
                     │ (4) Feeds feedback back to
                     ▼
             [CodeGen Agent] (Performs Refactoring / Critique Loop)
                     │
                     ▼
          ┌──────────┴──────────┐
          ▼ (5)                 ▼ (6)
    [TestGen Agent]         [Doc Agent]
  (Unit/Integration)    (README & API Spec)
```

---

## 🎓 Course Concepts Demonstrated (Capstone Verification)

This project applies and strictly implements the core requirements for the Kaggle Capstone Project:

| Requirement | Implementation Evidence in Codebase |
| :--- | :--- |
| **Agent / Multi-agent system (ADK)** | **Implemented in `lib/agents.js` & `lib/orchestrator.js`.** Includes a `BaseAgent` class handling API fallbacks and 5 specialized agents (CodeGen, Security, Architect, Test, Doc) operating in a coordinated critique loop. |
| **MCP Server** | **Implemented in `mcp_server.js` & `lib/mcp.js`.** A compliant Model Context Protocol server communicating over `stdio` via JSON-RPC 2.0. Exposes a `check_code_quality` tool that runs as a child process to perform static analysis. |
| **Security features** | **Implemented in `SecurityAgent` & `mcp_server.js`.** Code is evaluated against OWASP Top 10. The MCP tool actively scans for `eval()`, hardcoded secrets, and SQL injection patterns. Environment variables are strictly enforced. |
| **Deployability** | **Implemented in `pages/api/generate.js`.** A Vercel-ready Next.js app. Configured with `"X-Accel-Buffering": "no"` to ensure Server-Sent Events (SSE) stream perfectly through Vercel's edge proxies. |

---

## 📁 Project Structure

```
AgentForge/
├── components/
│   ├── AgentCard.js       # Agent pipeline display component
│   ├── CodeBlock.js       # Markdown & syntax-highlighted code container
│   └── OutputTabs.js      # Tabs for switching results
├── lib/
│   ├── agents.js          # Defined LLM prompts & client thinking methods
│   ├── mcp.js             # MCP Client Integration (Spawns subprocess)
│   └── orchestrator.js    # Central orchestration loop logic
├── pages/
│   ├── _app.js            # Global wrapper
│   ├── index.js           # Interactive UI dashboard
│   └── api/
│       └── generate.js    # Streaming POST api endpoint
├── mcp_server.js          # Local MCP Server for Code Quality Tool
├── styles/
│   └── globals.css        # Premium dark glassmorphism styling
├── package.json
└── next.config.js
```

---

## 🛠️ Getting Started & Setup

### Prerequisites
- Node.js (v18.x or above)
- GEMINI or Groq API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Umer-3085/Multi-Agent-Code-Review-System
   cd AgentForge
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory:
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and paste your Gemini API Key (get one at [aistudio.google.com](https://aistudio.google.com/app/apikey)):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Launch the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view your local instance.

---

## 🛡️ Security & Compliance
- **No API Keys in Source Code**: The application strictly reads the Gemini API key via secure backend environment variables (`process.env.GEMINI_API_KEY`). Keys are validated for correct format before any LLM call is made.
- **Input Sanitization**: User requirements are enclosed inside strict, structured prompts, preventing agents from executing malicious or injected instructions.
- **MCP Static Analysis**: Every generated code block is scanned by the MCP server for `eval()` usage, hardcoded secrets, and SQL injection patterns before LLM-based review begins.

---

## 🚀 Vercel Deployment Guide

AgentForge is deployed live at **https://multi-agent-code-review-plum.vercel.app** — judges can test it directly without any local setup.

To self-host:

1. **Deploy via Vercel CLI:**
   ```bash
   npm install -g vercel
   vercel
   ```
2. Follow the prompt questions.
3. Add `GEMINI_API_KEY` (and optionally `GROQ_API_KEY`) to the project's Environment Variables in the Vercel Settings Panel.
4. Deploy to production:
   ```bash
   vercel --prod
   ```

> **Note:** The `X-Accel-Buffering: no` header is already configured in `pages/api/generate.js` to ensure SSE streams correctly through Vercel's edge proxies.
