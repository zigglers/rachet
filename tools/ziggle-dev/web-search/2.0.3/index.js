// ../tool-repo/src/index.ts
import { createTool, ToolCategory, ToolCapability } from "@ziggler/clanker";
var DEFAULT_MAX_RESULTS = 10;
var X_AI_API_URL = "https://api.x.ai/v1/chat/completions";
function getApiKey(context) {
  var _a, _b, _c;
  let apiKey;
  const contextWithSharedState = context;
  if (contextWithSharedState.sharedState) {
    const sharedApiKey = contextWithSharedState.sharedState.get("clanker:apiKey");
    if (sharedApiKey && typeof sharedApiKey === "string") {
      apiKey = sharedApiKey;
      (_a = context.logger) == null ? void 0 : _a.debug("Using API key from shared state (clanker:apiKey)");
      return apiKey;
    }
    const provider = contextWithSharedState.sharedState.get("clanker:provider");
    if (provider === "grok" || provider === "openai") {
      const providerKey = contextWithSharedState.sharedState.get(`clanker:${provider}:apiKey`);
      if (providerKey && typeof providerKey === "string") {
        apiKey = providerKey;
        (_b = context.logger) == null ? void 0 : _b.debug(`Using API key from shared state (clanker:${provider}:apiKey)`);
        return apiKey;
      }
    }
  }
  apiKey = process.env.X_AI_API_KEY || process.env.GROK_API_KEY || process.env.OPENAI_API_KEY;
  if (apiKey) {
    (_c = context.logger) == null ? void 0 : _c.debug("Using API key from environment variable");
  }
  return apiKey;
}
function calculateFromDate(timeRange) {
  if (timeRange === "all") {
    return void 0;
  }
  const now = /* @__PURE__ */ new Date();
  switch (timeRange) {
    case "hour":
      now.setHours(now.getHours() - 1);
      break;
    case "day":
      now.setDate(now.getDate() - 1);
      break;
    case "week":
      now.setDate(now.getDate() - 7);
      break;
    case "month":
      now.setMonth(now.getMonth() - 1);
      break;
    case "year":
      now.setFullYear(now.getFullYear() - 1);
      break;
    default:
      return void 0;
  }
  return now.toISOString().split("T")[0];
}
var index_default = createTool().id("web-search").name("Web Search").description("Search the web and Twitter/X using X AI's live search API with Grok. Uses API key from Clanker settings or environment.").category(ToolCategory.Utility).capabilities(ToolCapability.NetworkAccess).tags("web", "search", "twitter", "x", "ai", "api", "internet", "query").stringArg("query", "Search query to execute", { required: true }).stringArg("search_type", "Type of search: web, twitter, or all", {
  required: false,
  default: "all",
  enum: ["web", "twitter", "all"]
}).numberArg("max_results", "Maximum number of results to return", {
  required: false,
  default: DEFAULT_MAX_RESULTS,
  validate: (value) => value > 0 && value <= 50 || "Max results must be between 1 and 50"
}).stringArg("time_range", "Time range for results: hour, day, week, month, year, or all", {
  required: false,
  default: "all",
  enum: ["hour", "day", "week", "month", "year", "all"]
}).stringArg("language", "Language code for results (e.g., en, es, fr)", {
  required: false,
  default: "en"
}).execute(async (args, context) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  const { query, search_type, max_results, time_range, language } = args;
  const apiKey = getApiKey(context);
  if (!apiKey) {
    (_a = context.logger) == null ? void 0 : _a.error("No API key found in settings or environment");
    return {
      success: false,
      error: "X AI API key is required. For Clanker users: ensure Grok provider is configured in settings. Otherwise, set X_AI_API_KEY or GROK_API_KEY environment variable."
    };
  }
  (_b = context.logger) == null ? void 0 : _b.info(`Searching for: ${query}`);
  (_c = context.logger) == null ? void 0 : _c.debug(`Search type: ${search_type}, Max results: ${max_results}, Time range: ${time_range}`);
  try {
    const toDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const fromDate = calculateFromDate(String(time_range));
    const requestBody = {
      model: "grok-3",
      messages: [
        {
          role: "system",
          content: search_type === "twitter" ? `You are a search assistant. Search Twitter/X for the latest posts and information about: ${query}. Focus on recent tweets and discussions.` : search_type === "web" ? `You are a search assistant. Search the web for information about: ${query}. Provide a comprehensive summary of the results from websites and articles.` : `You are a search assistant. Search both the web and Twitter/X for information about: ${query}. Provide a comprehensive summary combining results from both sources.`
        },
        {
          role: "user",
          content: String(query)
        }
      ],
      search_parameters: {
        max_search_results: Number(max_results) || DEFAULT_MAX_RESULTS,
        return_citations: true,
        ...fromDate && { from_date: fromDate },
        ...toDate && { to_date: toDate }
      },
      stream: false
    };
    (_d = context.logger) == null ? void 0 : _d.debug("Request body:", JSON.stringify(requestBody, null, 2));
    const response = await fetch(X_AI_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
      const errorText = await response.text();
      (_e = context.logger) == null ? void 0 : _e.error(`API error: ${response.status} - ${errorText}`);
      if (response.status === 401) {
        return {
          success: false,
          error: "Invalid API key. Please check your X AI API key."
        };
      } else if (response.status === 429) {
        return {
          success: false,
          error: "Rate limit exceeded. Please try again later."
        };
      }
      return {
        success: false,
        error: `X AI API error: ${response.status} - ${errorText}`
      };
    }
    const data = await response.json();
    if (!data.choices || data.choices.length === 0) {
      (_f = context.logger) == null ? void 0 : _f.error("No response from API");
      return {
        success: false,
        error: "No response from X AI API"
      };
    }
    const content = data.choices[0].message.content;
    const sourcesUsed = ((_g = data.usage) == null ? void 0 : _g.num_sources_used) || 0;
    let output = `## Search Results for "${query}"

`;
    output += content;
    if (data.citations && data.citations.length > 0) {
      output += `

### Sources:
`;
      data.citations.forEach((citation, index) => {
        output += `${index + 1}. ${citation}
`;
      });
    }
    if (sourcesUsed > 0) {
      output += `

*Searched ${sourcesUsed} sources*`;
    }
    (_h = context.logger) == null ? void 0 : _h.info(`Search completed successfully using ${sourcesUsed} sources`);
    return {
      success: true,
      output: output.trim(),
      data: {
        query,
        content,
        citations: data.citations || [],
        sources_used: sourcesUsed
      }
    };
  } catch (error) {
    (_i = context.logger) == null ? void 0 : _i.error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      error: `Search failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}).examples([
  {
    description: "Search the web for information",
    arguments: {
      query: "latest AI developments 2024"
    },
    result: "Returns web search results about AI developments"
  },
  {
    description: "Search Twitter/X for recent posts",
    arguments: {
      query: "OpenAI announcements",
      search_type: "twitter",
      time_range: "day"
    },
    result: "Returns recent Twitter/X posts about OpenAI"
  },
  {
    description: "Search with custom parameters",
    arguments: {
      query: "machine learning tutorials",
      max_results: 20,
      language: "en",
      time_range: "week"
    },
    result: "Returns up to 20 English results from the past week"
  },
  {
    description: "Search all sources",
    arguments: {
      query: "climate change news",
      search_type: "all",
      max_results: 15
    },
    result: "Returns results from both web and Twitter/X"
  }
]).build();
export {
  index_default as default
};
