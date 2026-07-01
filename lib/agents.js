/**
 * agents.js — Core Multi-Agent System (powered by Google Gemini)
 *
 * Each agent has a distinct role and system prompt.
 * Agents maintain conversation history for multi-turn critique loops.
 *
 * Architecture:
 *   CodeGenAgent    → writes production implementation code
 *   SecurityAgent   → OWASP-based vulnerability scanner (uses MCP tool output)
 *   ArchitectAgent  → evaluates design patterns and scalability
 *   TestAgent       → writes unit / integration tests
 *   DocAgent        → generates README and inline API docs
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Gemini Client ────────────────────────────────────────────────────────────
// API key loaded from environment variable — NEVER hardcoded
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// Use configurable model, defaulting to gemini-2.0-flash
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

// ─── Base Agent ───────────────────────────────────────────────────────────────
/**
 * BaseAgent — foundation for all specialized agents.
 * Each agent wraps a Gemini chat session for multi-turn conversation.
 */
class BaseAgent {
  constructor(name, role, systemPrompt) {
    this.name = name;
    this.role = role;
    this.systemPrompt = systemPrompt;
    /** @type {import("@google/generative-ai").ChatSession | null} */
    this.chatSession = null;
    this.messages = []; // Conversation history for Groq
  }

  /**
   * think() — sends a message to this agent's Gemini chat session.
   * Creates a new session on first call; subsequent calls continue conversation.
   *
   * @param {string} userMessage - The task or question for this agent
   * @returns {Promise<string>} - The agent's text response
   */
  async think(userMessage) {
    const hasGroq = !!process.env.GROQ_API_KEY;
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const maxRetries = 5;
    const baseDelay = 2000; // 2 seconds

    if (!hasGroq && !hasGemini) {
      throw new Error("No AI provider API key is configured. Set GEMINI_API_KEY or GROQ_API_KEY in your .env file.");
    }

    let provider = hasGroq ? "groq" : "gemini";

    // Lazily create Gemini chat session if not using Groq
    if (provider === "gemini" && !this.chatSession) {
      if (!genAI) {
        throw new Error("GEMINI_API_KEY is not set.");
      }
      const model = genAI.getGenerativeModel({
        model: MODEL,
        systemInstruction: this.systemPrompt,
      });
      this.chatSession = model.startChat({ history: [] });
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (provider === "groq") {
          // Push user message to history
          this.messages.push({ role: "user", content: userMessage });

          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
              messages: [
                { role: "system", content: this.systemPrompt },
                ...this.messages,
              ],
              temperature: 0.2,
            }),
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errText}`);
          }

          const data = await response.json();
          const assistantMessage = data.choices[0].message.content;

          // Push assistant message to history
          this.messages.push({ role: "assistant", content: assistantMessage });
          return assistantMessage;
        } else {
          const result = await this.chatSession.sendMessage(userMessage);
          return result.response.text();
        }
      } catch (error) {
        const errorMsg = error.message || "";
        const isAuthError =
          errorMsg.includes("401") ||
          errorMsg.includes("403") ||
          errorMsg.toLowerCase().includes("unauthorized") ||
          errorMsg.toLowerCase().includes("api key") ||
          errorMsg.toLowerCase().includes("authentication failed");

        if (provider === "groq" && hasGemini && isAuthError) {
          console.warn(`[${this.name} Agent] Groq authentication failed. Falling back to Gemini...`);
          provider = "gemini";
          if (!this.chatSession) {
            if (!genAI) {
              throw new Error("GEMINI_API_KEY is not set.");
            }
            const model = genAI.getGenerativeModel({
              model: MODEL,
              systemInstruction: this.systemPrompt,
            });
            this.chatSession = model.startChat({ history: [] });
          }
          continue;
        }
        
        // Detect daily quota limits. If daily quota is hit, do not retry because waiting a few seconds won't help.
        const isDailyLimit =
          errorMsg.includes("GenerateRequestsPerDay") ||
          (errorMsg.includes("generate_content_free_tier_requests") && errorMsg.includes("limit: 0"));

        if (isDailyLimit) {
          const dailyLimitMsg = `Daily free tier quota exhausted for model "${MODEL}". To resolve this, you can:\n` +
            `1. Switch the model (e.g., set GEMINI_MODEL=gemini-1.5-flash in your .env file)\n` +
            `2. Use a different Gemini API key in your .env file\n` +
            `3. Enable billing in Google AI Studio to increase your limits.`;
          console.error(`\n[${this.name} Agent] ${dailyLimitMsg}\n`);
          throw new Error(dailyLimitMsg);
        }

        const isRateLimit =
          error.status === 429 ||
          errorMsg.includes("429") ||
          errorMsg.toLowerCase().includes("too many requests") ||
          errorMsg.toLowerCase().includes("quota exceeded") ||
          errorMsg.toLowerCase().includes("quota");

        if (isRateLimit && attempt < maxRetries) {
          // If the error message specifies a wait time, parse and respect it
          let delayMs = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
          const retryInMatch = errorMsg.match(/Please retry in (\d+\.?\d*)s/i);
          if (retryInMatch) {
            const seconds = parseFloat(retryInMatch[1]);
            if (!isNaN(seconds)) {
              // Wait slightly longer than requested to be absolutely safe (add 1.5 seconds)
              delayMs = (seconds + 1.5) * 1000;
            }
          } else {
            // Also parse Groq's retry-after / wait message if present
            const groqRetryMatch = errorMsg.match(/try again in (\d+\.?\d*)s/i);
            if (groqRetryMatch) {
              const seconds = parseFloat(groqRetryMatch[1]);
              if (!isNaN(seconds)) {
                delayMs = (seconds + 1.5) * 1000;
              }
            }
          }

          console.warn(
            `[${this.name} Agent] Rate limit (429) encountered. Retrying in ${(delayMs / 1000).toFixed(1)}s... (Attempt ${attempt}/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          // Re-throw the error if not a rate limit, or after all retries are exhausted
          console.error(`[${this.name} Agent] Request failed: ${errorMsg}`);
          throw error;
        }
      }
    }
  }

  /** Reset the chat session between requests to avoid context bleed. */
  reset() {
    this.chatSession = null;
    this.messages = [];
  }
}

// ─── Specialized Agents ───────────────────────────────────────────────────────

/**
 * CodeGenAgent — Generates clean, production-ready implementation code.
 */
export class CodeGenAgent extends BaseAgent {
  constructor() {
    super(
      "CodeGen",
      "Code Generator",
      `You are an expert software engineer specializing in writing clean, production-ready code.
Your responsibilities:
- Write complete, working implementation code based on requirements
- Follow SOLID principles, clean code guidelines, and language best practices
- Include meaningful inline comments explaining complex logic
- Handle edge cases, errors, and input validation gracefully
- Use modern language features and idiomatic patterns

Output format:
1. Brief explanation of your approach (2-3 sentences)
2. Complete implementation code in a single fenced code block with appropriate language tag
3. List of dependencies or imports needed

Be precise and practical. Write code that a senior engineer would be proud of.`
    );
  }
}

/**
 * SecurityAgent — Performs OWASP-based security review.
 */
export class SecurityAgent extends BaseAgent {
  constructor() {
    super(
      "Security",
      "Security Reviewer",
      `You are a senior application security engineer with deep expertise in OWASP Top 10, secure coding, and threat modeling.
Your responsibilities:
- Analyze code for security vulnerabilities (injection, auth issues, data exposure, etc.)
- Reference specific OWASP categories when identifying issues
- Assess severity: CRITICAL / HIGH / MEDIUM / LOW
- Provide concrete, actionable fixes — show code snippets where helpful
- If a static analysis tool report is provided, incorporate its findings into your assessment

Output format:
## 🛡️ Security Analysis

### Vulnerabilities Found
For each issue:
**[SEVERITY] Issue Name** (OWASP: Axx)
- Description: what the vulnerability is
- Location: code reference
- Fix: exact remediation

### Security Score: X/10

### Recommended Hardening Measures
Additional security controls beyond fixing the listed issues`
    );
  }
}

/**
 * ArchitectAgent — Reviews system design, scalability, and patterns.
 */
export class ArchitectAgent extends BaseAgent {
  constructor() {
    super(
      "Architect",
      "Architecture Advisor",
      `You are a principal software architect with 15+ years of experience in distributed systems and API design.
Your responsibilities:
- Evaluate design patterns and architectural decisions in the code
- Assess scalability, maintainability, and extensibility
- Identify tight coupling, missing abstractions, or over-engineering
- Suggest appropriate patterns (Repository, Factory, CQRS, etc.) where needed
- If a static analysis report is provided, factor in any complexity concerns

Output format:
## 📐 Architecture Review

### Design Pattern Assessment

### Scalability Concerns

### Structural Recommendations
(include code snippets where helpful)

### Architecture Score: X/10`
    );
  }
}

/**
 * TestAgent — Writes comprehensive unit and integration tests.
 */
export class TestAgent extends BaseAgent {
  constructor() {
    super(
      "TestGen",
      "QA Engineer",
      `You are a senior QA engineer specializing in test-driven development.
Your responsibilities:
- Write comprehensive unit tests covering happy paths, edge cases, and error conditions
- Write integration tests for API endpoints where appropriate
- Follow AAA pattern (Arrange, Act, Assert)
- Test behavior — not implementation details
- Use appropriate mocking strategies for external dependencies

Output format:
1. Test strategy overview (framework chosen, test scope)
2. Complete test file(s) in fenced code blocks
3. Coverage summary — what scenarios are covered
4. Command to run the tests`
    );
  }
}

/**
 * DocAgent — Generates documentation: README, inline docs, API reference.
 */
export class DocAgent extends BaseAgent {
  constructor() {
    super(
      "DocWriter",
      "Documentation Specialist",
      `You are a technical writer who makes complex code accessible and understandable.
Your responsibilities:
- Write a clear, concise README with problem statement and solution description
- Document all public APIs with parameters, return values, and examples
- Create usage examples demonstrating real-world scenarios
- Write inline documentation comments (JSDoc / docstrings) for key functions
- Include setup instructions and a quick start guide

Output format:
## 📄 Documentation

### README
(Complete content ready to paste)

### API Reference

### Quick Start Examples`
    );
  }
}
