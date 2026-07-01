/**
 * orchestrator.js — Multi-Agent Orchestrator
 *
 * Coordinates execution flow between agents:
 * 1. CodeGenAgent writes initial code.
 * 2. MCP-style static analysis runs inline (no child process needed).
 * 3. SecurityAgent reviews code using OWASP, augmented by static analysis.
 * 4. ArchitectAgent reviews design patterns and scalability.
 * 5. CodeGenAgent critique loop: refines based on review feedback.
 * 6. TestAgent generates comprehensive tests.
 * 7. DocAgent creates README documentation.
 */

import {
  CodeGenAgent,
  SecurityAgent,
  ArchitectAgent,
  TestAgent,
  DocAgent,
} from "./agents";
import { analyzeCodeWithMCP } from "./mcp";

// ─── Fallback Static Analysis ───────────────────────────────────────────────
/**
 * runStaticAnalysis() — Lightweight fallback for environments where the MCP
 * server cannot be spawned. Keeps the pipeline functional while still allowing
 * the main flow to demonstrate MCP-based analysis when available.
 *
 * @param {string} code - Source code to analyze
 * @returns {object} - MCP-style findings report
 */
function runStaticAnalysis(code) {
  const findings = [];
  let score = 10;

  if (code.includes("eval(")) {
    findings.push({
      type: "Warning",
      rule: "No eval()",
      message: "eval() detected — severe XSS and code-injection risk.",
      severity: "Critical",
    });
    score -= 3;
  }

  if (code.includes("console.log(")) {
    findings.push({
      type: "Advice",
      rule: "Remove debug logs",
      message: "console.log() found — replace with a structured logger in production.",
      severity: "Low",
    });
    score -= 0.5;
  }

  const secretsRegex =
    /(password|secret|api[_-]?key|token|private[_-]?key)\s*[:=]\s*['"`][a-zA-Z0-9_\-./+=]{6,}['"`]/gi;
  if (secretsRegex.test(code)) {
    findings.push({
      type: "Warning",
      rule: "No hardcoded secrets",
      message: "Potential hardcoded credential or secret detected.",
      severity: "Critical",
    });
    score -= 4;
  }

  if (/SELECT .* FROM .* WHERE .*\+/i.test(code)) {
    findings.push({
      type: "Warning",
      rule: "No string-concat SQL",
      message: "Possible SQL injection via string concatenation. Use parameterized queries.",
      severity: "High",
    });
    score -= 3;
  }

  if (score < 1) score = 1;

  return {
    score: parseFloat(score.toFixed(1)),
    findings,
    summary: `MCP static analysis complete. Score: ${score.toFixed(1)}/10. Identified ${findings.length} concern(s).`,
  };
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────
export class MultiAgentOrchestrator {
  constructor() {
    this.codeGen  = new CodeGenAgent();
    this.security = new SecurityAgent();
    this.architect = new ArchitectAgent();
    this.test     = new TestAgent();
    this.doc      = new DocAgent();
  }

  /**
   * run() — Executes the full multi-agent pipeline sequentially.
   *
   * @param {string} requirements - Plain-English engineering requirements
   * @param {function} onProgress - Callback invoked at each agent transition
   * @returns {Promise<object>} - Final outputs from all agents
   */
  async run(requirements, onProgress = () => {}) {
    // Reset conversation history between requests
    [this.codeGen, this.security, this.architect, this.test, this.doc]
      .forEach((a) => a.reset());

    // ─── Step 1: Code Generation ────────────────────────────────────────────
    onProgress({ agent: "CodeGen", status: "thinking", message: "Writing initial implementation..." });
    const initialCode = await this.codeGen.think(
      `Write a clean, complete, production-ready implementation for the following requirements:\n\n${requirements}`
    );
    onProgress({ agent: "CodeGen", status: "done", message: "Initial code complete.", output: initialCode });

    // ─── Step 2: MCP Static Analysis via live MCP server ───────────────────
    onProgress({ agent: "Security", status: "thinking", message: "Running MCP static analysis tool..." });
    let mcpReport = await analyzeCodeWithMCP(initialCode);

    if (!mcpReport || typeof mcpReport !== "object") {
      onProgress({ agent: "Security", status: "thinking", message: "MCP analysis unavailable; using fallback static checks..." });
      const fallbackReport = runStaticAnalysis(initialCode);
      if (fallbackReport) {
        mcpReport = fallbackReport;
      }
    }

    // ─── Step 3: Security Review ─────────────────────────────────────────────
    onProgress({ agent: "Security", status: "thinking", message: "Auditing code against OWASP Top 10..." });
    const securityReview = await this.security.think(
      `You are reviewing generated code for a production deployment.
Below is a static analysis report from our MCP code quality tool:
${JSON.stringify(mcpReport, null, 2)}

Now perform a full OWASP-based security review of the code:
\`\`\`
${initialCode}
\`\`\``
    );
    onProgress({ agent: "Security", status: "done", message: "Security audit complete.", output: securityReview });

    // ─── Step 4: Architecture Review ─────────────────────────────────────────
    onProgress({ agent: "Architect", status: "thinking", message: "Evaluating architecture and design patterns..." });
    const archReview = await this.architect.think(
      `Review the architecture, design patterns, and scalability of this code.
Consider these MCP static findings as additional context:
${JSON.stringify(mcpReport, null, 2)}

Code under review:
\`\`\`
${initialCode}
\`\`\``
    );
    onProgress({ agent: "Architect", status: "done", message: "Architecture review complete.", output: archReview });

    // ─── Step 5: Critique & Refinement Loop ──────────────────────────────────
    onProgress({ agent: "CodeGen", status: "thinking", message: "Refining code based on all agent feedback..." });
    const refinedCode = await this.codeGen.think(
      `The Security and Architecture agents have reviewed your code. Update and improve the implementation to address ALL feedback below. Return a complete, corrected code block.

SECURITY REVIEW:
${securityReview}

ARCHITECTURE REVIEW:
${archReview}`
    );
    onProgress({ agent: "CodeGen", status: "done", message: "Refined code ready.", output: refinedCode });

    // ─── Step 6: Test Generation ──────────────────────────────────────────────
    onProgress({ agent: "TestGen", status: "thinking", message: "Writing unit and integration tests..." });
    const tests = await this.test.think(
      `Write comprehensive unit and integration tests using the AAA (Arrange, Act, Assert) pattern for:\n\n${refinedCode}`
    );
    onProgress({ agent: "TestGen", status: "done", message: "Test suite ready.", output: tests });

    // ─── Step 7: Documentation ────────────────────────────────────────────────
    onProgress({ agent: "DocWriter", status: "thinking", message: "Writing README and API documentation..." });
    const docs = await this.doc.think(
      `Write complete README documentation, API reference, and usage examples for:\n\n${refinedCode}`
    );
    onProgress({ agent: "DocWriter", status: "done", message: "Documentation complete.", output: docs });

    return { initialCode, securityReview, archReview, refinedCode, tests, docs };
  }
}
