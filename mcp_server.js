/**
 * mcp_server.js — Code Quality Model Context Protocol (MCP) Server
 *
 * Implements the MCP protocol over standard I/O (stdio).
 * Exposes a tool: `check_code_quality` which performs static analysis on generated code.
 */

const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

// Logger for debugging (directing to stderr to prevent breaking JSON-RPC on stdout)
function logDebug(msg) {
  process.stderr.write(`[MCP Debug] ${msg}\n`);
}

rl.on("line", (line) => {
  if (!line.trim()) return;

  try {
    const request = JSON.parse(line);
    logDebug(`Received request method: ${request.method}`);

    // Standard MCP Protocol Handlers
    switch (request.method) {
      case "initialize":
        sendResponse(request.id, {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "code-quality-mcp-server",
            version: "1.0.0",
          },
        });
        break;

      case "tools/list":
        sendResponse(request.id, {
          tools: [
            {
              name: "check_code_quality",
              description: "Analyzes programming code for complexity, hardcoded values, and common syntax issues.",
              inputSchema: {
                type: "object",
                properties: {
                  code: {
                    type: "string",
                    description: "The source code string to analyze.",
                  },
                },
                required: ["code"],
              },
            },
          ],
        });
        break;

      case "tools/call":
        handleToolCall(request);
        break;

      default:
        // Respond with method not found error
        sendError(request.id, -32601, `Method not found: ${request.method}`);
        break;
    }
  } catch (err) {
    logDebug(`Failed to parse request JSON: ${err.message}`);
    sendError(null, -32700, "Parse error");
  }
});

function handleToolCall(request) {
  const { name, arguments: args } = request.params || {};

  if (name !== "check_code_quality") {
    return sendError(request.id, -32602, `Unknown tool: ${name}`);
  }

  const code = args?.code || "";
  const findings = [];
  let score = 10;

  // Static checks
  if (code.includes("eval(")) {
    findings.push({
      type: "Warning",
      rule: "No eval()",
      message: "Detected use of eval(), which presents significant security risks.",
      severity: "High",
    });
    score -= 3;
  }

  if (code.includes("console.log(")) {
    findings.push({
      type: "Advice",
      rule: "Remove debug logs",
      message: "Console logging found. Consider using a structured logging framework in production.",
      severity: "Low",
    });
    score -= 0.5;
  }

  // Check for hardcoded secrets or passwords
  const secretsRegex = /(password|secret|apikey|token|private_key|privatekey)\s*=\s*['"`][a-zA-Z0-9_\-\.\/+=]{8,}['"`]/gi;
  if (secretsRegex.test(code)) {
    findings.push({
      type: "Warning",
      rule: "No hardcoded secrets",
      message: "Detected potential hardcoded credentials, secret keys, or authentication tokens.",
      severity: "Critical",
    });
    score -= 4;
  }

  // Check function complexity (simple count of lines)
  const lines = code.split("\n");
  let longFunctions = 0;
  lines.forEach((line) => {
    if ((line.includes("function ") || line.includes("=>")) && line.length > 120) {
      longFunctions++;
    }
  });

  if (longFunctions > 0) {
    findings.push({
      type: "Style Guide",
      rule: "Keep lines short",
      message: `${longFunctions} line(s) exceed 120 characters. Keep lines short to ensure readability.`,
      severity: "Low",
    });
    score -= 0.5;
  }

  // Boundaries check
  if (score < 1) score = 1;

  const resultPayload = {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          score: parseFloat(score.toFixed(1)),
          findings,
          summary: `Code quality check completed. Score: ${score.toFixed(1)}/10. Identified ${findings.length} concern(s).`,
        }, null, 2),
      },
    ],
  };

  sendResponse(request.id, resultPayload);
}

function sendResponse(id, result) {
  const payload = {
    jsonrpc: "2.0",
    id,
    result,
  };
  process.stdout.write(JSON.stringify(payload) + "\n");
}

function sendError(id, code, message) {
  const payload = {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  };
  process.stdout.write(JSON.stringify(payload) + "\n");
}
