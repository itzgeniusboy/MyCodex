import { NextRequest, NextResponse } from "next/server";

// 21 AI Providers Configuration
interface ProviderConfig {
  baseUrl: string;
  defaultModel: string;
  models: {
    Low: string;
    Med: string;
    High: string;
  };
}

const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/v1",
    defaultModel: "gemini-2.5-flash",
    models: { Low: "gemini-2.5-flash", Med: "gemini-1.5-pro", High: "gemini-2.5-pro" }
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    models: { Low: "gpt-4o-mini", Med: "o3-mini", High: "gpt-4o" }
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-sonnet-20241022",
    models: { Low: "claude-3-haiku-20240307", Med: "claude-3-5-haiku-20241022", High: "claude-3-5-sonnet-20241022" }
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com",
    defaultModel: "deepseek-chat",
    models: { Low: "deepseek-chat", Med: "deepseek-chat", High: "deepseek-reasoner" }
  },
  kimi: {
    baseUrl: "https://api.moonshot.cn/v1",
    defaultModel: "moonshot-v1-8k",
    models: { Low: "moonshot-v1-8k", Med: "moonshot-v1-32k", High: "moonshot-v1-128k" }
  },
  minimax: {
    baseUrl: "https://api.minimax.chat/v1",
    defaultModel: "abab6.5s-chat",
    models: { Low: "abab6.5s-chat", Med: "abab7-chat", High: "abab7-chat" }
  },
  xai: {
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-2-mini",
    models: { Low: "grok-2-mini", Med: "grok-2-1212", High: "grok-beta" }
  },
  meta: {
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    models: { Low: "llama-3.1-8b-instant", Med: "llama-3.3-70b-versatile", High: "llama-3.1-405b" }
  },
  mistral: {
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
    models: { Low: "open-mistral-7b", Med: "mistral-small-latest", High: "mistral-large-latest" }
  },
  qwen: {
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-2.5-7b-instruct",
    models: { Low: "qwen-2.5-7b-instruct", Med: "qwen-2.5-32b-instruct", High: "qwen-2.5-72b-instruct" }
  },
  perplexity: {
    baseUrl: "https://api.perplexity.ai",
    defaultModel: "sonar",
    models: { Low: "sonar-small", Med: "sonar-medium", High: "sonar-pro" }
  },
  cohere: {
    baseUrl: "https://api.cohere.com/v1",
    defaultModel: "command",
    models: { Low: "command-light", Med: "command", High: "command-r-plus" }
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    models: { Low: "llama-3.1-8b-instant", Med: "llama-3.3-70b-versatile", High: "llama-3.3-70b-versatile" }
  },
  together: {
    baseUrl: "https://api.together.xyz/v1",
    defaultModel: "meta-llama/Llama-3.3-70b-instruct-turbo",
    models: { Low: "meta-llama/Llama-3-8b-chat-hf", Med: "meta-llama/Llama-3.3-70b-instruct-turbo", High: "meta-llama/Llama-3.1-405b-instruct-turbo" }
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "auto",
    models: { Low: "meta-llama/llama-3-8b-instruct:free", Med: "google/gemini-flash-1.5", High: "anthropic/claude-3.5-sonnet" }
  },
  huggingface: {
    baseUrl: "https://api-inference.huggingface.co/v1",
    defaultModel: "meta-llama/Llama-3.1-8B-Instruct",
    models: { Low: "meta-llama/Llama-3.1-8B-Instruct", Med: "meta-llama/Llama-3.3-70B-Instruct", High: "meta-llama/Llama-3.1-405B-Instruct" }
  },
  stability: {
    baseUrl: "https://api.stability.ai/v1",
    defaultModel: "stable-lm-3b",
    models: { Low: "stable-lm-3b", Med: "stable-lm-7b", High: "stable-lm-13b" }
  },
  novita: {
    baseUrl: "https://api.novita.ai/v3/openai/v1",
    defaultModel: "meta-llama/llama-3.3-70b-instruct",
    models: { Low: "meta-llama/llama-3-8b-instruct", Med: "meta-llama/llama-3.3-70b-instruct", High: "meta-llama/llama-3.1-405b" }
  },
  fireworks: {
    baseUrl: "https://api.fireworks.ai/inference/v1",
    defaultModel: "accounts/fireworks/models/llama-v3-3-70b-instruct",
    models: { Low: "accounts/fireworks/models/llama-v3-8b-instruct", Med: "accounts/fireworks/models/llama-v3-3-70b-instruct", High: "accounts/fireworks/models/llama-v3-1-405b-instruct" }
  },
  replicate: {
    baseUrl: "https://api.replicate.com/v1",
    defaultModel: "meta/meta-llama-3-70b-instruct",
    models: { Low: "meta/llama-2-7b-chat", Med: "meta/llama-2-70b-chat", High: "meta/meta-llama-3-70b-instruct" }
  },
  anyscale: {
    baseUrl: "https://api.endpoints.anyscale.com/v1",
    defaultModel: "meta-llama/Llama-3-70b-chat-hf",
    models: { Low: "meta-llama/Llama-3-8b-chat-hf", Med: "meta-llama/Llama-3-70b-chat-hf", High: "meta-llama/Llama-3-405b-chat-hf" }
  }
};

const getNormalizedProviderKey = (input: string): string => {
  const normalized = input.toLowerCase();
  if (normalized.includes("gemini") || normalized.includes("google")) return "gemini";
  if (normalized.includes("openai") || normalized.includes("chatgpt")) return "openai";
  if (normalized.includes("anthropic") || normalized.includes("claude")) return "anthropic";
  if (normalized.includes("deepseek")) return "deepseek";
  if (normalized.includes("kimi") || normalized.includes("moonshot")) return "kimi";
  if (normalized.includes("minimax")) return "minimax";
  if (normalized.includes("xai") || normalized.includes("grok")) return "xai";
  if (normalized.includes("meta") || normalized.includes("llama")) return "meta";
  if (normalized.includes("mistral")) return "mistral";
  if (normalized.includes("qwen") || normalized.includes("alibaba")) return "qwen";
  if (normalized.includes("perplexity") || normalized.includes("sonar")) return "perplexity";
  if (normalized.includes("cohere")) return "cohere";
  if (normalized.includes("groq")) return "groq";
  if (normalized.includes("together")) return "together";
  if (normalized.includes("openrouter")) return "openrouter";
  if (normalized.includes("hugging")) return "huggingface";
  if (normalized.includes("stability")) return "stability";
  if (normalized.includes("novita")) return "novita";
  if (normalized.includes("fireworks")) return "fireworks";
  if (normalized.includes("replicate")) return "replicate";
  if (normalized.includes("anyscale")) return "anyscale";
  return "gemini";
};

const getEnvKeyName = (prov: string): string => {
  switch (prov) {
    case "gemini": return "GEMINI_API_KEY";
    case "openai": return "OPENAI_API_KEY";
    case "anthropic": return "ANTHROPIC_API_KEY";
    case "deepseek": return "DEEPSEEK_API_KEY";
    case "kimi": return "KIMI_API_KEY";
    case "minimax": return "MINIMAX_API_KEY";
    case "xai": return "XAI_API_KEY";
    case "meta": return "META_API_KEY";
    case "mistral": return "MISTRAL_API_KEY";
    case "qwen": return "QWEN_API_KEY";
    case "perplexity": return "PERPLEXITY_API_KEY";
    case "cohere": return "COHERE_API_KEY";
    case "groq": return "GROQ_API_KEY";
    case "together": return "TOGETHER_API_KEY";
    case "openrouter": return "OPENROUTER_API_KEY";
    case "huggingface": return "HUGGINGFACE_API_KEY";
    case "stability": return "STABILITY_API_KEY";
    case "novita": return "NOVITA_API_KEY";
    case "fireworks": return "FIREWORKS_API_KEY";
    case "replicate": return "REPLICATE_API_KEY";
    case "anyscale": return "ANYSCALE_API_KEY";
    default: return "GEMINI_API_KEY";
  }
};

export async function POST(req: NextRequest) {
  try {
    const { 
      messages, 
      routingLevel = "Auto", 
      selectedCustomModel, 
      savedApiKeys = [],
      customApiKey,
      activeEngine,
      customProvider,
      customModel,
      stream = true
    } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages list is required." }, { status: 400 });
    }

    // 1. Analyze prompt intent on the last message
    const lastMsgContent = messages[messages.length - 1]?.content || "";
    const lowercaseMsg = lastMsgContent.toLowerCase();

    const isCodingPrompt = /build|coding|react|next\.js|refactor|component|code|architecture|database|api|backend|frontend|css|html|script|typescript|javascript|developer|engineer|write a|implement/i.test(lowercaseMsg);

    const isReasoningPrompt = /reason|math|logic|explanation|why|solve|proof|derivation|complex|algorithm|optimization|analysis|science|deep/i.test(lowercaseMsg);

    // 2. Resolve Active Keys (Custom list + Env fallbacks)
    const activeKeys: Record<string, string> = {};
    for (const prov of Object.keys(PROVIDER_CONFIGS)) {
      const envVar = getEnvKeyName(prov);
      if (process.env[envVar]) {
        activeKeys[prov] = process.env[envVar] || "";
      }
    }

    if (Array.isArray(savedApiKeys)) {
      for (const item of savedApiKeys) {
        const provName = getNormalizedProviderKey(item.provider || "");
        const keyVal = item.secretKey || item.apiKey || item.key;
        if (keyVal && keyVal.trim() !== "" && !keyVal.startsWith("session-verified-token-")) {
          activeKeys[provName] = keyVal.trim();
        }
      }
    }

    if (customApiKey && customApiKey.trim() !== "" && !customApiKey.startsWith("session-verified-token-")) {
      let deducedProv = "gemini";
      if (customApiKey.startsWith("gsk_")) deducedProv = "groq";
      else if (customApiKey.startsWith("sk-")) deducedProv = "openai";
      else if (customApiKey.startsWith("AIzaSy")) deducedProv = "gemini";
      else if (customProvider) deducedProv = getNormalizedProviderKey(customProvider);
      activeKeys[deducedProv] = customApiKey.trim();
    }

    // 3. Routing Intelligence Logic
    let activeProvider = "gemini";
    let activeModel = "gemini-2.5-flash";

    if (routingLevel === "Custom") {
      activeProvider = customProvider ? getNormalizedProviderKey(customProvider) : "gemini";
      activeModel = selectedCustomModel || customModel || PROVIDER_CONFIGS[activeProvider].defaultModel;
    } else if (routingLevel === "Auto") {
      if (isCodingPrompt && activeKeys["anthropic"]) {
        activeProvider = "anthropic";
        activeModel = "claude-3-5-sonnet-20241022";
      } else if (isReasoningPrompt && activeKeys["deepseek"]) {
        activeProvider = "deepseek";
        activeModel = "deepseek-reasoner";
      } else if (isReasoningPrompt && activeKeys["openai"]) {
        activeProvider = "openai";
        activeModel = "o1";
      } else {
        let chosen = customProvider ? getNormalizedProviderKey(customProvider) : "";
        if (!chosen && activeEngine && activeEngine.provider) {
          chosen = getNormalizedProviderKey(activeEngine.provider);
        }
        if (chosen && activeKeys[chosen]) {
          activeProvider = chosen;
        } else {
          const loadedKeys = Object.keys(activeKeys);
          activeProvider = loadedKeys.includes("gemini") ? "gemini" : (loadedKeys[0] || "gemini");
        }
        const config = PROVIDER_CONFIGS[activeProvider] || PROVIDER_CONFIGS["gemini"];
        activeModel = config.models.Med || config.defaultModel;
      }
    } else {
      // Tier: Low, Medium, High
      let chosen = customProvider ? getNormalizedProviderKey(customProvider) : "";
      if (!chosen && activeEngine && activeEngine.provider) {
        chosen = getNormalizedProviderKey(activeEngine.provider);
      }
      if (chosen && activeKeys[chosen]) {
        activeProvider = chosen;
      } else {
        const loadedKeys = Object.keys(activeKeys);
        activeProvider = loadedKeys.includes("gemini") ? "gemini" : (loadedKeys[0] || "gemini");
      }
      const config = PROVIDER_CONFIGS[activeProvider] || PROVIDER_CONFIGS["gemini"];
      const tier = (routingLevel || "Medium") as "Low" | "Medium" | "High";
      activeModel = config.models[tier] || config.defaultModel;
    }

    const apiKey = activeKeys[activeProvider];
    if (!apiKey) {
      return NextResponse.json({ 
        error: `API key for routing provider "${activeProvider}" is not saved. Please set it in the console.` 
      }, { status: 400 });
    }

    const config = PROVIDER_CONFIGS[activeProvider];
    let requestUrl = `${config.baseUrl}/chat/completions`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    // Specific header structures
    if (activeProvider === "gemini") {
      requestUrl = `https://generativelanguage.googleapis.com/v1beta/openai/v1/chat/completions?key=${apiKey}`;
    } else if (activeProvider === "anthropic") {
      requestUrl = "https://api.anthropic.com/v1/messages";
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
    } else if (activeProvider === "deepseek") {
      requestUrl = "https://api.deepseek.com/chat/completions";
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const limitedMessages = messages.length > 15 ? messages.slice(-15) : messages;

    // Body structures
    let requestBody: any = {};
    if (activeProvider === "anthropic") {
      requestBody = {
        model: activeModel,
        messages: limitedMessages.map((m: any) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content
        })),
        max_tokens: 4096,
        temperature: 0.7,
        stream: stream
      };
    } else {
      const isO1 = activeModel.startsWith("o1");
      requestBody = {
        model: activeModel,
        messages: limitedMessages.map((m: any) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content
        })),
        stream: stream
      };
      if (!isO1) {
        requestBody.temperature = 0.7;
      }
    }

    console.log(`[ROUTE INTENT SELECTOR]: Routed to ${activeProvider.toUpperCase()} (${activeModel}) via ${routingLevel} tier`);

    const response = await fetch(requestUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `API upstream error (${response.status}): ${errText}` }, { status: 500 });
    }

    if (!stream) {
      const data = await response.json();
      let reply = "No output";
      if (activeProvider === "anthropic") {
        reply = data.content?.[0]?.text || "";
      } else {
        reply = data.choices?.[0]?.message?.content || "";
      }
      return NextResponse.json({ reply });
    }

    // 4. Stream handling across all 21 providers
    const textEncoder = new TextEncoder();
    const customReadable = new ReadableStream({
      async start(controller) {
        if (!response.body) {
          controller.enqueue(textEncoder.encode("Error: Streaming unavailable."));
          controller.close();
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        const processOpenAIChunk = (line: string): string | null => {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") return null;
          if (trimmed.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              return json.choices?.[0]?.delta?.content || "";
            } catch (e) {
              return "";
            }
          }
          return "";
        };

        const processAnthropicChunk = (line: string): string | null => {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              if (json.type === "content_block_delta" && json.delta?.text) {
                return json.delta.text;
              }
              if (json.delta?.text) {
                return json.delta.text;
              }
            } catch (e) {
              return "";
            }
          }
          return "";
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              let parsedToken = "";
              if (activeProvider === "anthropic") {
                parsedToken = processAnthropicChunk(line) || "";
              } else {
                parsedToken = processOpenAIChunk(line) || "";
              }
              if (parsedToken) {
                controller.enqueue(textEncoder.encode(parsedToken));
              }
            }
          }
          controller.close();
        } catch (err: any) {
          controller.enqueue(textEncoder.encode(`\n[Stream Error]: ${err.message}`));
          controller.close();
        }
      }
    });

    return new Response(customReadable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });

  } catch (error: any) {
    console.error("Intelligent Routing Error:", error);
    return NextResponse.json({ error: error.message || "Internal Routing Error" }, { status: 500 });
  }
}
