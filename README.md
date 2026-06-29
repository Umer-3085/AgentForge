# 🚀 Autonomous Multi-Agent Code Review & Synthesis System

A production-grade, collaborative software engineering assistant built for the **AI Agents: Intensive Vibe Coding Capstone Project (Agents for Business Track)**. 

This platform deploys a network of five specialized AI agents that review, critique, and co-develop software requirements. It showcases real-time agent coordination, security audits based on OWASP standards, and code refactoring loops before outputting a fully tested and documented result.

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
| **Agent skills (Agents CLI) & Antigravity** | **Demonstrated in Video.** The YouTube submission explicitly highlights the usage of the Antigravity/Agents CLI during the project build process. |

---

## 📁 Project Structure

```
multi-agent-code-review/
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
- GEMINI API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repository-url>
   cd multi-agent-code-review
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
   Open `.env.local` and paste your Anthropic API Key:
   ```env
   GEMINI_API_KEY=your_sk_key_here
   ```

4. **Launch the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view your local instance.

---

## 🛡️ Security & Compliance
- **No API Keys in Source Code**: The application strictly reads the Anthropic keys via secure backend environment variables (`process.env.GEMINI_API_KEY`).
- **Input Sanitization**: Users write requirements that are enclosed dynamically inside strict prompts, ensuring agents do not execute malicious scripts.

---

## 🚀 Vercel Deployment Guide

To host this project online for the judges to run live:

1. **Deploy via Vercel CLI:**
   ```bash
   npm install -g vercel
   vercel
   ```
2. Follow the prompt questions.
3. Add the `GEMINI_API_KEY` to the project variables inside the Vercel Settings Panel.
4. Deploy to production:
   ```bash
   vercel --prod
   ```
