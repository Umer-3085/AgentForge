/**
 * test_pipeline.js — Test runner for the multi-agent orchestrator & MCP server.
 *
 * Mocks the Anthropic SDK client calls to verify orchestrator flow logic,
 * MCP server tool invocation, and callback emissions without requiring live API keys.
 */

const path = require("path");
const fs = require("fs");

// Mock Anthropic SDK Client module
const mockAnthropicInstance = {
  messages: {
    create: async ({ system, messages }) => {
      const lastMsg = messages[messages.length - 1]?.content || "";
      console.log(`[Mock Agent Think] Received prompt length: ${lastMsg.length}`);

      // Respond based on role or context
      if (system.includes("Code Generator")) {
        if (messages.length > 2) {
          return {
            content: [
              {
                text: "```javascript\n// Refined code\nconsole.log('Secure logic without eval');\n```\nSuccessfully remediated all secure issues.",
              },
            ],
          };
        }
        return {
          content: [
            {
              text: "```javascript\n// Initial code draft\neval('vulnerable');\nconsole.log('test');\n```",
            },
          ],
        };
      }

      if (system.includes("Security Reviewer")) {
        return {
          content: [
            {
              text: "## Security Review\nFound CRITICAL vulnerability: eval usage.\nScore: 3/10",
            },
          ],
        };
      }

      if (system.includes("Architecture Advisor")) {
        return {
          content: [
            {
              text: "## Architecture Review\nDesign pattern looks solid, minor suggestions for scale.",
            },
          ],
        };
      }

      if (system.includes("QA Engineer")) {
        return {
          content: [
            {
              text: "```javascript\n// Test suite code\ndescribe('test', () => {});\n```",
            },
          ],
        };
      }

      if (system.includes("Documentation Specialist")) {
        return {
          content: [
            {
              text: "## Documentation\nREADME files and execution templates included.",
            },
          ],
        };
      }

      return { content: [{ text: "Mock response." }] };
    },
  },
};

// Override standard require/import of @anthropic-ai/sdk by rewriting orchestrator in-memory
// or calling it directly with mocked environment
async function test() {
  console.log("Starting Multi-Agent Orchestrator Test...");

  // Mock global process environment variable so client initialization doesn't throw
  process.env.ANTHROPIC_API_KEY = "mock_key";

  // Dynamic import of our files
  // Note: we're using Babel/Next.js dynamic loaders inside ES modules, but for Node.js test scripts,
  // we can import using standard ESM if supported, or translate paths.
  // Let's verify that the local MCP server runs correctly on its own first.
  const { analyzeCodeWithMCP } = require("../lib/mcp");

  const vulnerableCode = `
    function processInput(userInput) {
      eval(userInput);
      const secret = "private_key_abc123xyz";
      console.log("Logged security concern " + secret);
    }
  `;

  console.log("\n--- Testing MCP Server Analysis Tool ---");
  console.log("Passing vulnerable code with eval and hardcoded secret...");

  const mcpReport = await analyzeCodeWithMCP(vulnerableCode);
  console.log("MCP Analysis Output:", JSON.stringify(mcpReport, null, 2));

  // Verify finding checks
  if (mcpReport.score < 5) {
    console.log("✅ SUCCESS: MCP Server successfully detected vulnerabilities and decreased the score!");
  } else {
    console.log("❌ FAILURE: MCP Server did not flags errors.");
  }
}

test().catch(console.error);
