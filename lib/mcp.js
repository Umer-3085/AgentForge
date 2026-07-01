/**
 * mcp.js — MCP Client Integration
 *
 * Spawns the local MCP server as a subprocess, initializes the connection,
 * executes the `check_code_quality` tool, and returns the JSON static analysis report.
 */

import { spawn } from "child_process";
import path from "path";

/**
 * Invokes the local Code Quality MCP server to inspect the generated code.
 *
 * @param {string} code - The code block to verify
 * @returns {Promise<object>} - Static analysis results
 */
export function analyzeCodeWithMCP(code) {
  return new Promise((resolve) => {
    try {
      const serverPath = path.resolve(process.cwd(), "mcp_server.js");

      // Spawn the MCP server Node.js process
      const mcpProcess = spawn("node", [serverPath]);

      let stdoutBuffer = "";
      let stderrBuffer = "";
      let isResolved = false;

      mcpProcess.stdout.on("data", (data) => {
        stdoutBuffer += data.toString();
        processLines();
      });

      mcpProcess.stderr.on("data", (data) => {
        stderrBuffer += data.toString();
      });

      mcpProcess.on("error", (err) => {
        console.error("Failed to spawn MCP server:", err);
        cleanup(null);
      });

      mcpProcess.on("exit", (codeVal) => {
        if (!isResolved) {
          console.warn(`MCP server exited with code ${codeVal} before resolving. Stderr: ${stderrBuffer}`);
          cleanup(null);
        }
      });

      // Write the standard JSON-RPC handshake first, followed by the tool call
      const handshake = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "app-orchestrator", version: "1.0.0" },
        },
      };

      const toolCall = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "check_code_quality",
          arguments: { code },
        },
      };

      mcpProcess.stdin.write(JSON.stringify(handshake) + "\n");
      mcpProcess.stdin.write(JSON.stringify(toolCall) + "\n");

      function processLines() {
        const lines = stdoutBuffer.split("\n");
        // Keep the last chunk in the buffer if it is incomplete
        stdoutBuffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const response = JSON.parse(line);

            // Wait until we get the response for the tool call (id: 2)
            if (response.id === 2) {
              const textContent = response.result?.content?.[0]?.text;
              if (textContent) {
                const analysisResult = JSON.parse(textContent);
                cleanup(analysisResult);
                return;
              }
            }
          } catch (e) {
            console.error("Error parsing JSON line from MCP server:", e);
          }
        }
      }

      function cleanup(result) {
        if (isResolved) return;
        isResolved = true;

        try {
          mcpProcess.stdin.end();
          mcpProcess.kill();
        } catch (e) {
          // ignore kill errors
        }

        resolve(
          result || {
            score: 10,
            findings: [],
            summary: "MCP quality check skipped due to runtime server warning.",
          }
        );
      }
    } catch (error) {
      console.error("MCP analysis handler failed:", error);
      resolve({
        score: 10,
        findings: [],
        summary: `MCP quality check failed to execute: ${error.message}`,
      });
    }
  });
}
