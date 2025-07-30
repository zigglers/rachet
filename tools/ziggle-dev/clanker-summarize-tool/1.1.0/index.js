// ../tool-repo/src/index.ts
import * as fs from "fs";
import * as path from "path";
var tool = {
  id: "summarize",
  name: "summarize",
  description: "Intelligently summarize any content with various abstraction levels, modes, and output formats. Can extract insights, action items, key points, or create custom summaries based on your needs.",
  version: "1.1.0",
  author: "Clanker Team",
  tags: ["summarize", "abstract", "analysis", "extract", "insights", "ai", "flexible"],
  capabilities: ["file-read", "ai-access"],
  args: [
    {
      name: "text",
      type: "string",
      description: "The content to summarize (can be any text, code, logs, etc.)",
      required: false
    },
    {
      name: "file",
      type: "string",
      description: "Path to file to summarize (alternative to text)",
      required: false
    },
    {
      name: "mode",
      type: "string",
      description: "Summarization mode: auto, brief, detailed, bullet_points, key_insights, action_items, technical, executive, creative, academic, conversational, questions, pros_cons, timeline, comparison",
      required: false,
      default: "auto"
    },
    {
      name: "format",
      type: "string",
      description: "Output format: markdown, plain, json, html, outline",
      required: false,
      default: "markdown"
    },
    {
      name: "instructions",
      type: "string",
      description: "Custom instructions for summarization",
      required: false
    },
    {
      name: "max_length",
      type: "number",
      description: "Maximum length of summary in words (0 = no limit)",
      required: false,
      default: 0
    },
    {
      name: "language",
      type: "string",
      description: "Language for the summary output",
      required: false,
      default: "english"
    },
    {
      name: "include_quotes",
      type: "boolean",
      description: "Include relevant quotes from source",
      required: false,
      default: false
    },
    {
      name: "include_stats",
      type: "boolean",
      description: "Include statistics about the content",
      required: false,
      default: false
    },
    {
      name: "focus",
      type: "string",
      description: "Specific aspect to focus on",
      required: false
    },
    {
      name: "abstraction_level",
      type: "number",
      description: "Level of abstraction (1-5, where 1 is very concrete and 5 is very abstract)",
      required: false,
      default: 3
    }
  ],
  execute: async (args, context) => {
    const {
      text,
      file,
      mode = "auto",
      format = "markdown",
      instructions,
      max_length = 0,
      language = "english",
      include_quotes = false,
      include_stats = false,
      focus,
      abstraction_level = 3
    } = args;
    if (!text && !file) {
      return {
        success: false,
        error: "Either text or file parameter must be provided"
      };
    }
    if (text && file) {
      return {
        success: false,
        error: "Cannot provide both text and file parameters"
      };
    }
    if (abstraction_level < 1 || abstraction_level > 5) {
      return {
        success: false,
        error: "Abstraction level must be between 1 (very concrete) and 5 (very abstract)"
      };
    }
    let contentToSummarize = text || "";
    if (file) {
      try {
        const cwd = (context == null ? void 0 : context.cwd) || process.cwd();
        const resolvedPath = path.resolve(cwd, file);
        if (!fs.existsSync(resolvedPath)) {
          return {
            success: false,
            error: `File not found: ${file}`
          };
        }
        contentToSummarize = fs.readFileSync(resolvedPath, "utf-8");
      } catch (error) {
        return {
          success: false,
          error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
    const analysis = analyzeContent(contentToSummarize);
    let summary = "";
    switch (mode) {
      case "brief":
        summary = generateBriefSummary(analysis, abstraction_level);
        break;
      case "detailed":
        summary = generateDetailedSummary(analysis, abstraction_level);
        break;
      case "bullet_points":
        summary = generateBulletPoints(analysis, focus);
        break;
      case "key_insights":
        summary = generateKeyInsights(analysis, abstraction_level);
        break;
      case "action_items":
        summary = generateActionItems(analysis);
        break;
      case "technical":
        summary = generateTechnicalSummary(analysis, abstraction_level);
        break;
      case "executive":
        summary = generateExecutiveSummary(analysis);
        break;
      case "questions":
        summary = generateQuestions(analysis);
        break;
      case "pros_cons":
        summary = generateProsConsList(analysis);
        break;
      case "timeline":
        summary = generateTimeline(analysis);
        break;
      case "creative":
        summary = generateCreativeSummary(analysis, instructions);
        break;
      case "academic":
        summary = generateAcademicSummary(analysis);
        break;
      case "conversational":
        summary = generateConversationalSummary(analysis);
        break;
      case "comparison":
        summary = generateComparisonSummary(analysis);
        break;
      default:
        summary = generateAutoSummary(analysis, abstraction_level, instructions);
    }
    if (focus) {
      summary = applyFocusFilter(summary, focus, analysis);
    }
    if (include_quotes) {
      const quotes = extractRelevantQuotes(contentToSummarize, summary);
      summary = appendQuotes(summary, quotes, format);
    }
    if (include_stats) {
      const stats = generateStats(contentToSummarize);
      summary = appendStats(summary, stats, format);
    }
    const formattedSummary = formatOutput(summary, format, mode);
    if (max_length > 0) {
      formattedSummary.content = trimToWordLimit(formattedSummary.content, max_length);
    }
    return {
      success: true,
      output: formattedSummary.content,
      data: {
        mode,
        format,
        abstractionLevel: abstraction_level,
        originalLength: contentToSummarize.length,
        summaryLength: formattedSummary.content.length,
        compressionRatio: Math.round((1 - formattedSummary.content.length / contentToSummarize.length) * 100),
        source: file ? `file: ${file}` : "text input",
        method: "pattern-based",
        metadata: formattedSummary.metadata
      }
    };
  }
};
function analyzeContent(text) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());
  const sections = /* @__PURE__ */ new Map();
  let lastSection = "Introduction";
  text.split("\n").forEach((line) => {
    const sectionMatch = line.match(/^#{1,6}\s+(.+)$|^(.+):$/);
    if (sectionMatch) {
      lastSection = sectionMatch[1] || sectionMatch[2];
      sections.set(lastSection, []);
    } else if (line.trim()) {
      const current = sections.get(lastSection) || [];
      current.push(line);
      sections.set(lastSection, current);
    }
  });
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const keywords = /* @__PURE__ */ new Map();
  words.forEach((word) => {
    if (!isCommonWord(word)) {
      keywords.set(word, (keywords.get(word) || 0) + 1);
    }
  });
  const entities = extractEntities(text);
  const dates = text.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi) || [];
  const numbers = text.match(/\b\d+(?:\.\d+)?%?\b/g) || [];
  const codeBlocks = text.match(/```[\s\S]*?```/g) || [];
  const lists = extractLists(text);
  const questions = sentences.filter((s) => s.trim().endsWith("?"));
  const actionableItems = extractActionableItems(sentences);
  return {
    sentences,
    paragraphs,
    sections,
    keywords,
    entities,
    dates,
    numbers,
    codeBlocks,
    lists,
    questions,
    actionableItems
  };
}
function generateBriefSummary(analysis, abstractionLevel) {
  const keyPoints = extractKeyPoints(analysis, 3);
  return keyPoints.join(" ");
}
function generateDetailedSummary(analysis, abstractionLevel) {
  const sections = [];
  analysis.sections.forEach((content, title) => {
    if (content.length > 0) {
      sections.push(`**${title}**
${content.slice(0, 3).join(" ")}`);
    }
  });
  return sections.slice(0, 5).join("\n\n");
}
function generateBulletPoints(analysis, focus) {
  const points = extractKeyPoints(analysis, 10, focus);
  return points.map((p) => `\u2022 ${p}`).join("\n");
}
function generateKeyInsights(analysis, abstractionLevel) {
  const insights = [];
  const topKeywords = Array.from(analysis.keywords.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([word]) => word);
  if (topKeywords.length > 0) {
    insights.push(`Main themes: ${topKeywords.join(", ")}`);
  }
  if (analysis.numbers.length > 5) {
    insights.push("Contains significant quantitative data");
  }
  if (analysis.questions.length > 3) {
    insights.push("Raises multiple questions for consideration");
  }
  if (analysis.codeBlocks.length > 0) {
    insights.push("Includes technical implementation details");
  }
  return insights.map((insight, i) => `${i + 1}. ${insight}`).join("\n");
}
function generateActionItems(analysis) {
  if (analysis.actionableItems.length === 0) {
    return "No explicit action items found.";
  }
  return analysis.actionableItems.slice(0, 10).map((item, i) => `${i + 1}. ${item}`).join("\n");
}
function generateTechnicalSummary(analysis, abstractionLevel) {
  const parts = [];
  if (analysis.codeBlocks.length > 0) {
    parts.push(`**Code Examples**: ${analysis.codeBlocks.length} code blocks found`);
  }
  const technicalTerms = Array.from(analysis.keywords.entries()).filter(([word]) => isTechnicalTerm(word)).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (technicalTerms.length > 0) {
    parts.push(`**Technical concepts**: ${technicalTerms.map(([w]) => w).join(", ")}`);
  }
  const implementation = analysis.sentences.filter(
    (s) => /implement|algorithm|function|method|class|interface|api/i.test(s)
  ).slice(0, 3);
  if (implementation.length > 0) {
    parts.push(`**Implementation details**:
${implementation.join(" ")}`);
  }
  return parts.join("\n\n");
}
function generateExecutiveSummary(analysis) {
  const parts = [];
  if (analysis.paragraphs.length > 0) {
    parts.push(`**Overview**: ${analysis.paragraphs[0].substring(0, 200)}...`);
  }
  if (analysis.numbers.length > 0) {
    parts.push(`**Key Metrics**: ${analysis.numbers.slice(0, 5).join(", ")}`);
  }
  const recommendations = analysis.sentences.filter(
    (s) => /recommend|suggest|should|propose|advise/i.test(s)
  ).slice(0, 3);
  if (recommendations.length > 0) {
    parts.push(`**Recommendations**:
${recommendations.map((r) => `\u2022 ${r.trim()}`).join("\n")}`);
  }
  return parts.join("\n\n");
}
function generateQuestions(analysis) {
  const questions = analysis.questions.length > 0 ? analysis.questions : generateImpliedQuestions(analysis);
  return questions.slice(0, 5).map((q, i) => `${i + 1}. ${q.trim()}`).join("\n");
}
function generateProsConsList(analysis) {
  const pros = [];
  const cons = [];
  analysis.sentences.forEach((sentence) => {
    if (/advantage|benefit|positive|improve|enhance|efficient/i.test(sentence)) {
      pros.push(sentence.trim());
    } else if (/disadvantage|drawback|negative|issue|problem|challenge/i.test(sentence)) {
      cons.push(sentence.trim());
    }
  });
  let result = "**Pros:**\n";
  result += pros.slice(0, 5).map((p) => `\u2022 ${p}`).join("\n");
  result += "\n\n**Cons:**\n";
  result += cons.slice(0, 5).map((c) => `\u2022 ${c}`).join("\n");
  return result;
}
function generateTimeline(analysis) {
  if (analysis.dates.length === 0) {
    return "No temporal information found for timeline generation.";
  }
  const timeline = [];
  analysis.dates.forEach((date) => {
    const relatedSentences = analysis.sentences.filter((s) => s.includes(date));
    if (relatedSentences.length > 0) {
      timeline.push(`**${date}**: ${relatedSentences[0].trim()}`);
    }
  });
  return timeline.join("\n");
}
function generateCreativeSummary(analysis, instructions) {
  const keyElements = extractKeyPoints(analysis, 5);
  const narrative = keyElements.join(" Meanwhile, ").replace(/\. Meanwhile,/g, ". Meanwhile,");
  return `In this narrative, we discover that ${narrative.toLowerCase()} This journey reveals the interconnected nature of these elements.`;
}
function generateAcademicSummary(analysis) {
  const thesis = analysis.paragraphs[0] ? analysis.paragraphs[0].substring(0, 150) : "The text presents multiple concepts.";
  const evidence = extractKeyPoints(analysis, 3);
  const conclusion = analysis.paragraphs[analysis.paragraphs.length - 1] ? analysis.paragraphs[analysis.paragraphs.length - 1].substring(0, 150) : "Further research is warranted.";
  return `**Thesis**: ${thesis}

**Evidence**:
${evidence.map((e) => `\u2022 ${e}`).join("\n")}

**Conclusion**: ${conclusion}`;
}
function generateConversationalSummary(analysis) {
  const points = extractKeyPoints(analysis, 5);
  return `So basically, here's what we're looking at: ${points[0]} Also worth noting that ${points[1]} And get this - ${points[2] || "there are some interesting details here."}`;
}
function generateComparisonSummary(analysis) {
  const aspects = [];
  const comparisons = analysis.sentences.filter(
    (s) => /compared to|versus|unlike|similar to|different from|contrast/i.test(s)
  );
  if (comparisons.length > 0) {
    aspects.push(`**Direct Comparisons**:
${comparisons.slice(0, 3).map((c) => `\u2022 ${c.trim()}`).join("\n")}`);
  }
  const prosConsResult = generateProsConsList(analysis);
  if (prosConsResult !== "**Pros:**\n\n\n**Cons:**\n") {
    aspects.push(prosConsResult);
  }
  return aspects.join("\n\n") || "No clear comparisons found in the text.";
}
function generateAutoSummary(analysis, abstractionLevel, instructions) {
  if (analysis.actionableItems.length > 5) {
    return generateActionItems(analysis);
  } else if (analysis.codeBlocks.length > 2) {
    return generateTechnicalSummary(analysis, abstractionLevel);
  } else if (analysis.numbers.length > 10) {
    return generateExecutiveSummary(analysis);
  } else {
    return generateDetailedSummary(analysis, abstractionLevel);
  }
}
function extractKeyPoints(analysis, count, focus) {
  let sentences = [...analysis.sentences];
  if (focus) {
    sentences = sentences.filter((s) => s.toLowerCase().includes(focus.toLowerCase()));
  }
  const scored = sentences.map((sentence) => {
    let score = 0;
    if (sentence.length > 50 && sentence.length < 200) score += 2;
    if (/\d+/.test(sentence)) score += 1;
    analysis.keywords.forEach((count2, keyword) => {
      if (sentence.toLowerCase().includes(keyword)) {
        score += Math.min(count2, 3);
      }
    });
    const position = analysis.sentences.indexOf(sentence);
    if (position < 5) score += 2;
    return { sentence, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, count).map((item) => item.sentence.trim());
}
function extractEntities(text) {
  const entities = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  return [...new Set(entities)];
}
function extractLists(text) {
  const lists = [];
  const lines = text.split("\n");
  let currentList = [];
  lines.forEach((line) => {
    if (/^[\s]*[-*•]\s+/.test(line) || /^[\s]*\d+\.\s+/.test(line)) {
      currentList.push(line.trim());
    } else if (currentList.length > 0) {
      lists.push(currentList);
      currentList = [];
    }
  });
  if (currentList.length > 0) {
    lists.push(currentList);
  }
  return lists;
}
function extractActionableItems(sentences) {
  const actionPatterns = [
    /\b(?:will|should|must|need(?:s)? to|have to|going to|plan to|intend to)\s+\w+/i,
    /\b(?:TODO|FIXME|ACTION|TASK|NEXT STEP):\s*.+/i,
    /\b(?:action items?|next steps?|deliverables?):\s*.+/i,
    /\b(?:responsible|assigned to|owner):\s*\w+/i
  ];
  return sentences.filter(
    (sentence) => actionPatterns.some((pattern) => pattern.test(sentence))
  );
}
function extractRelevantQuotes(text, summary) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const summaryLower = summary.toLowerCase();
  const relevant = sentences.filter((sentence) => {
    const words = sentence.toLowerCase().split(/\s+/);
    const matchCount = words.filter(
      (word) => word.length > 4 && summaryLower.includes(word)
    ).length;
    return matchCount > 3 && sentence.length > 30 && sentence.length < 150;
  });
  return relevant.slice(0, 3);
}
function generateStats(text) {
  const words = text.split(/\s+/).length;
  const sentences = (text.match(/[.!?]+/g) || []).length;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
  const avgWordsPerSentence = sentences > 0 ? Math.round(words / sentences) : 0;
  return {
    words,
    sentences,
    paragraphs,
    avgWordsPerSentence,
    characters: text.length,
    readingTime: Math.ceil(words / 200)
    // Average reading speed
  };
}
function appendQuotes(summary, quotes, format) {
  if (quotes.length === 0) return summary;
  const quotesSection = quotes.map((q) => `> "${q}"`).join("\n\n");
  switch (format) {
    case "markdown":
      return `${summary}

### Relevant Quotes

${quotesSection}`;
    case "plain":
      return `${summary}

Relevant Quotes:

${quotes.map((q) => `"${q}"`).join("\n\n")}`;
    default:
      return summary;
  }
}
function appendStats(summary, stats, format) {
  switch (format) {
    case "markdown":
      return `${summary}

---

**Document Statistics:**
- Words: ${stats.words}
- Sentences: ${stats.sentences}
- Reading time: ~${stats.readingTime} minutes`;
    case "json":
      return JSON.stringify({ summary, stats }, null, 2);
    default:
      return summary;
  }
}
function applyFocusFilter(summary, focus, analysis) {
  const focusLower = focus.toLowerCase();
  const lines = summary.split("\n");
  const filtered = lines.filter(
    (line) => line.toLowerCase().includes(focusLower) || line.length < 50
    // Keep headers and short lines
  );
  if (filtered.length < lines.length / 2) {
    return summary;
  }
  return filtered.join("\n");
}
function formatOutput(content, format, mode) {
  switch (format) {
    case "json":
      return {
        content: JSON.stringify({
          mode,
          summary: content,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }, null, 2),
        metadata: { format: "json" }
      };
    case "html":
      return {
        content: `<!DOCTYPE html>
<html>
<head>
    <title>Summary - ${mode}</title>
    <meta charset="utf-8">
</head>
<body>
    <h1>Summary</h1>
    <div class="summary-content">
        ${content.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}
    </div>
    <footer>
        <p>Generated on ${(/* @__PURE__ */ new Date()).toLocaleDateString()}</p>
    </footer>
</body>
</html>`,
        metadata: { format: "html" }
      };
    case "outline":
      const lines = content.split("\n");
      const outlined = lines.map((line) => {
        if (line.startsWith("**") && line.endsWith("**")) {
          return line.replace(/\*\*/g, "");
        } else if (line.startsWith("\u2022 ")) {
          return "  " + line;
        } else if (line.match(/^\d+\. /)) {
          return "  " + line;
        } else {
          return "    " + line;
        }
      });
      return {
        content: outlined.join("\n"),
        metadata: { format: "outline" }
      };
    case "plain":
      return {
        content: content.replace(/[*_#`]/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"),
        metadata: { format: "plain" }
      };
    default:
      return {
        content,
        metadata: { format: "markdown" }
      };
  }
}
function trimToWordLimit(text, limit) {
  const words = text.split(/\s+/);
  if (words.length <= limit) return text;
  return words.slice(0, limit).join(" ") + "...";
}
function generateImpliedQuestions(analysis) {
  const questions = [];
  if (analysis.numbers.length > 0) {
    questions.push("What do these metrics indicate about performance?");
  }
  if (analysis.dates.length > 0) {
    questions.push("What is the significance of this timeline?");
  }
  if (analysis.actionableItems.length > 0) {
    questions.push("Who is responsible for implementing these actions?");
  }
  const topKeywords = Array.from(analysis.keywords.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (topKeywords.length > 0) {
    questions.push(`How does ${topKeywords[0][0]} relate to the main objective?`);
  }
  return questions;
}
function isCommonWord(word) {
  const common = /* @__PURE__ */ new Set([
    "the",
    "be",
    "to",
    "of",
    "and",
    "a",
    "in",
    "that",
    "have",
    "i",
    "it",
    "for",
    "not",
    "on",
    "with",
    "he",
    "as",
    "you",
    "do",
    "at",
    "this",
    "but",
    "his",
    "by",
    "from",
    "they",
    "we",
    "say",
    "her",
    "she",
    "or",
    "an",
    "will",
    "my",
    "one",
    "all",
    "would",
    "there",
    "their",
    "what",
    "so",
    "up",
    "out",
    "if",
    "about",
    "who",
    "get",
    "which",
    "go",
    "me",
    "when",
    "make",
    "can",
    "like",
    "time",
    "no",
    "just",
    "him",
    "know",
    "take",
    "people",
    "into",
    "year",
    "your",
    "good",
    "some",
    "could",
    "them",
    "see",
    "other",
    "than",
    "then",
    "now",
    "look",
    "only",
    "come",
    "its",
    "over",
    "think",
    "also",
    "back",
    "after",
    "use",
    "two",
    "how",
    "our",
    "work",
    "first",
    "well",
    "way",
    "even",
    "new",
    "want",
    "because",
    "any",
    "these",
    "give",
    "day",
    "most",
    "us",
    "is",
    "was",
    "are",
    "been",
    "has",
    "had",
    "were",
    "said",
    "did",
    "having",
    "may",
    "such"
  ]);
  return common.has(word.toLowerCase());
}
function isTechnicalTerm(word) {
  const technical = [
    "api",
    "algorithm",
    "function",
    "method",
    "class",
    "interface",
    "database",
    "server",
    "client",
    "protocol",
    "framework",
    "library",
    "component",
    "module",
    "system",
    "architecture",
    "implementation",
    "performance",
    "optimization",
    "configuration",
    "deployment",
    "integration",
    "authentication",
    "authorization",
    "encryption",
    "cache",
    "queue",
    "thread",
    "process",
    "memory",
    "cpu",
    "network"
  ];
  return technical.includes(word.toLowerCase());
}
var index_default = tool;
export {
  index_default as default
};
