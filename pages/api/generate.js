import { MultiAgentOrchestrator } from "../../lib/orchestrator";

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { requirements } = req.body || {};
  if (!requirements || typeof requirements !== "string" || !requirements.trim()) {
    return res.status(400).json({ error: "Missing 'requirements' in request body." });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (!groqKey) {
    if (!geminiKey || geminiKey === "your_gemini_api_key_here") {
      return res.status(500).json({
        error:
          "Neither GROQ_API_KEY nor GEMINI_API_KEY is set. " +
          "Please add one of these keys to your .env file to continue.",
      });
    }

    // Valid Gemini keys start with "AIza" or "AQ."
    if (!geminiKey.startsWith("AIza") && !geminiKey.startsWith("AQ.")) {
      return res.status(500).json({
        error:
          `Your GEMINI_API_KEY (starting with "${geminiKey.slice(0, 6)}...") doesn't look like a valid Gemini API key. ` +
          "Valid keys start with 'AIza' or 'AQ.'. Get one at https://aistudio.google.com/app/apikey",
      });
    }
  }

  // ─── SSE Setup ──────────────────────────────────────────────────────────────
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no", // Disable nginx buffering for Vercel/proxies
  });

  const sendEvent = (event, data) => {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      if (typeof res.flush === "function") res.flush();
    } catch (e) {
      console.error("SSE write error:", e);
    }
  };

  const orchestrator = new MultiAgentOrchestrator();

  try {
    sendEvent("status", { message: "Multi-agent system initializing..." });

    const results = await orchestrator.run(requirements, (progress) => {
      sendEvent("progress", progress);
    });

    sendEvent("complete", results);
  } catch (error) {
    console.error("[Orchestrator Error]", error.message);
    
    let msg = error.message || "Unexpected error during orchestration.";
    if (
      error.message?.includes("API_KEY") ||
      error.message?.includes("401") ||
      error.message?.includes("403") ||
      error.message?.toLowerCase().includes("unauthorized") ||
      error.message?.toLowerCase().includes("authentication failed")
    ) {
      msg = "Authentication failed. Check that your GEMINI_API_KEY or GROQ_API_KEY is valid and restart the app after updating .env.";
    } else if (error.message?.includes("429") || error.message?.toLowerCase().includes("quota")) {
      msg = "API rate limit or daily quota exceeded. If using the Free Tier, wait a moment, use a different model, or consider adding a billing method.";
    }
    
    sendEvent("error", { message: msg });
  } finally {
    res.end();
  }
}