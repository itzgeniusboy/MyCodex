import { NextRequest, NextResponse } from "next/server";

// Dynamic routing for multiple AI providers inside Next.js (built for Vercel Serverless/Edge)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, provider, apiKey } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request payload: 'messages' array is required." },
        { status: 400 }
      );
    }

    // Determine the active provider
    // Normalize provider name (e.g., 'Google Gemini', 'Groq', 'OpenAI (ChatGPT)', 'DeepSeek')
    const serviceProvider = String(provider || "Google Gemini").trim();
    const cleanProvider = serviceProvider.toLowerCase();

    // Determine the API Key to use
    // If a custom client key is provided, use it. Otherwise, look for the corresponding system env variable.
    let activeKey = typeof apiKey === "string" && apiKey.trim() !== "" ? apiKey.trim() : "";

    if (!activeKey) {
      if (cleanProvider.includes("gemini") || cleanProvider.includes("google")) {
        activeKey = process.env.GEMINI_API_KEY || "";
      } else if (cleanProvider.includes("groq")) {
        activeKey = process.env.GROQ_API_KEY || "";
      } else if (cleanProvider.includes("openai") || cleanProvider.includes("chatgpt")) {
        activeKey = process.env.OPENAI_API_KEY || "";
      } else if (cleanProvider.includes("deepseek")) {
        activeKey = process.env.DEEPSEEK_API_KEY || "";
      }
    }

    // Core validation: Ensure an API Key is available
    if (!activeKey) {
      return NextResponse.json(
        {
          error: `API Key missing for ${serviceProvider}. Please provide a custom API key in your settings panel or request the system administrator to configure the server environment variable.`,
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------------
    // 1. Google Gemini Route
    // ------------------------------------------------------------------------
    if (cleanProvider.includes("gemini") || cleanProvider.includes("google")) {
      const model = "gemini-2.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;

      // Convert messages to Gemini API format
      const limitedMessages = messages.length > 15 ? messages.slice(-15) : messages;
      
      // Clean and group identical consecutive roles to avoid API conflicts
      const mappedParts = limitedMessages
        .filter((m: any) => m && m.content && String(m.content).trim() !== "")
        .map((m: any) => {
          const role = m.role === "assistant" || m.role === "model" ? "model" : "user";
          return { role, text: String(m.content).trim() };
        });

      const groupedContents: any[] = [];
      if (mappedParts.length > 0) {
        let currentGroup = mappedParts[0];
        for (let i = 1; i < mappedParts.length; i++) {
          const nextMsg = mappedParts[i];
          if (nextMsg.role === currentGroup.role) {
            currentGroup.text += "\n\n" + nextMsg.text;
          } else {
            groupedContents.push(currentGroup);
            currentGroup = nextMsg;
          }
        }
        groupedContents.push(currentGroup);
      }

      // Ensure conversation starts with 'user' role
      while (groupedContents.length > 0 && groupedContents[0].role !== "user") {
        groupedContents.shift();
      }

      const contents = groupedContents.map(item => ({
        role: item.role,
        parts: [{ text: item.text }]
      }));

      const payload = {
        contents: contents.length > 0 ? contents : [
          {
            role: "user",
            parts: [{ text: messages[messages.length - 1]?.content || "Hello" }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
        }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          { error: `Google Gemini API returned status ${response.status}: ${errorText}` },
          { status: response.status }
        );
      }

      const responseData = await response.json();
      const reply = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "No response returned from Gemini.";
      return NextResponse.json({ reply });
    }

    // ------------------------------------------------------------------------
    // 2. Groq Route
    // ------------------------------------------------------------------------
    if (cleanProvider.includes("groq")) {
      const groqUrl = "https://api.groq.com/openai/v1/chat/completions";
      const limitedMessages = messages.length > 15 ? messages.slice(-15) : messages;

      const response = await fetch(groqUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: limitedMessages.map((m: any) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: String(m.content || "")
          })),
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          { error: `Groq API returned status ${response.status}: ${errorText}` },
          { status: response.status }
        );
      }

      const responseData = await response.json();
      const reply = responseData.choices?.[0]?.message?.content || "No response returned from Groq.";
      return NextResponse.json({ reply });
    }

    // ------------------------------------------------------------------------
    // 3. OpenAI Route
    // ------------------------------------------------------------------------
    if (cleanProvider.includes("openai") || cleanProvider.includes("chatgpt")) {
      const openaiUrl = "https://api.openai.com/v1/chat/completions";
      const limitedMessages = messages.length > 15 ? messages.slice(-15) : messages;

      const response = await fetch(openaiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: limitedMessages.map((m: any) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: String(m.content || "")
          })),
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          { error: `OpenAI API returned status ${response.status}: ${errorText}` },
          { status: response.status }
        );
      }

      const responseData = await response.json();
      const reply = responseData.choices?.[0]?.message?.content || "No response returned from OpenAI.";
      return NextResponse.json({ reply });
    }

    // ------------------------------------------------------------------------
    // 4. DeepSeek Route
    // ------------------------------------------------------------------------
    if (cleanProvider.includes("deepseek")) {
      // Use DeepSeek API endpoint which matches OpenAI syntax
      const deepseekUrl = "https://api.deepseek.com/chat/completions";
      const limitedMessages = messages.length > 15 ? messages.slice(-15) : messages;

      const response = await fetch(deepseekUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: limitedMessages.map((m: any) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: String(m.content || "")
          })),
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          { error: `DeepSeek API returned status ${response.status}: ${errorText}` },
          { status: response.status }
        );
      }

      const responseData = await response.json();
      const reply = responseData.choices?.[0]?.message?.content || "No response returned from DeepSeek.";
      return NextResponse.json({ reply });
    }

    // ------------------------------------------------------------------------
    // Unsupported Provider Fallback
    // ------------------------------------------------------------------------
    return NextResponse.json(
      { error: `Requested provider '${serviceProvider}' is not supported by our API router.` },
      { status: 400 }
    );

  } catch (error: any) {
    console.error("Backend Chat API processing error:", error);
    return NextResponse.json(
      { error: `Internal server processing error: ${error?.message || "An unexpected error occurred."}` },
      { status: 500 }
    );
  }
}
