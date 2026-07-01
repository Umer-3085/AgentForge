const { spawn } = require("child_process");
const path = require("path");

async function runMcpTest() {
  return new Promise((resolve, reject) => {
    const serverPath = path.resolve(__dirname, "../mcp_server.js");
    const mcpProcess = spawn("node", [serverPath]);

    let stdoutBuffer = "";

    mcpProcess.stdout.on("data", (data) => {
      stdoutBuffer += data.toString();
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        console.log("[MCP RESPONSE]:", line);
        try {
          const response = JSON.parse(line);
          if (response.id === 2) {
            console.log("SUCCESS: Received tool call response!");
            mcpProcess.kill();
            resolve();
          }
        } catch (e) {
          console.error("JSON Parse Error:", e);
        }
      }
    });

    mcpProcess.stderr.on("data", (data) => {
      console.error("[MCP STDERR]:", data.toString());
    });

    // Send handshake
    mcpProcess.stdin.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1.0.0" } },
      }) + "\n"
    );

    // Send tool call
    mcpProcess.stdin.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "check_code_quality",
          arguments: { code: "function test() { eval('console.log(123)'); const secret = 'key_abc123'; }" },
        },
      }) + "\n"
    );
  });
}

console.log("Testing MCP Server directly...");
runMcpTest().then(() => console.log("Test complete."));
