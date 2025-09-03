// ../tool-repo/src/index.ts
import { createTool, ToolCategory, ToolCapability } from "@ziggler/clanker";
import * as fs from "fs/promises";
import * as path from "path";
import fastGlob from "fast-glob";
var index_default = createTool().id("search").name("Search").description("Fast file and text searching with glob patterns and regex support, similar to ripgrep").category(ToolCategory.FileSystem).capabilities(ToolCapability.FileRead).tags("search", "grep", "find", "glob", "regex", "text", "files").stringArg("pattern", "The search pattern (supports regex)", { required: true }).stringArg("path", "Directory or file path to search in", { default: "." }).stringArg("glob", 'Glob pattern to filter files (e.g., "*.{ts,tsx,js,jsx}")', { default: "**/*" }).booleanArg("ignoreCase", "Case-insensitive search", { default: false }).booleanArg("filesOnly", "Only show matching file names, not content", { default: false }).booleanArg("regex", "Treat pattern as a regular expression", { default: true }).booleanArg("literal", "Treat pattern as literal string (overrides regex)", { default: false }).numberArg("context", "Number of context lines to show", { default: 0 }).stringArg("exclude", "Glob pattern to exclude files", { default: "" }).booleanArg("hidden", "Include hidden files", { default: false }).booleanArg("stats", "Show search statistics", { default: false }).numberArg("maxResults", "Maximum number of results to show", { default: 1e3 }).examples([
  {
    description: 'Search for "TODO" in all TypeScript files',
    arguments: { pattern: "TODO", glob: "*.ts" }
  },
  {
    description: "Find all React component imports",
    arguments: { pattern: "import.*React", glob: "*.{tsx,jsx}" }
  },
  {
    description: 'Case-insensitive search for "error" with context',
    arguments: { pattern: "error", ignoreCase: true, context: 2 }
  },
  {
    description: "Find files containing specific text pattern",
    arguments: { pattern: "TextInput|InputBox|UserInput", path: "./src", glob: "*.{ts,tsx}" }
  },
  {
    description: "Literal string search (no regex)",
    arguments: { pattern: "config.json", literal: true }
  },
  {
    description: "Search excluding node_modules and dist",
    arguments: { pattern: "import", exclude: "**/node_modules/**,**/dist/**" }
  }
]).execute(async (args, context) => {
  const startTime = Date.now();
  const results = [];
  const stats = {
    filesSearched: 0,
    filesMatched: 0,
    totalMatches: 0,
    elapsedMs: 0
  };
  const pattern = args.pattern;
  const searchPathArg = args.path;
  const globPattern = args.glob;
  const ignoreCase = args.ignoreCase;
  const filesOnly = args.filesOnly;
  const regex = args.regex;
  const literal = args.literal;
  const contextLines = args.context;
  const exclude = args.exclude;
  const hidden = args.hidden;
  const showStats = args.stats;
  const maxResults = args.maxResults;
  try {
    const searchPath = path.resolve(searchPathArg);
    try {
      await fs.access(searchPath);
    } catch {
      return {
        success: false,
        error: `Path does not exist: ${searchPath}`
      };
    }
    let searchRegex;
    if (literal) {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      searchRegex = new RegExp(escaped, ignoreCase ? "gi" : "g");
    } else if (regex) {
      try {
        searchRegex = new RegExp(pattern, ignoreCase ? "gi" : "g");
      } catch (e) {
        return {
          success: false,
          error: `Invalid regex pattern: ${pattern}`
        };
      }
    } else {
      searchRegex = new RegExp(pattern, ignoreCase ? "gi" : "g");
    }
    const isFile = (await fs.stat(searchPath)).isFile();
    let files = [];
    if (isFile) {
      files = [searchPath];
    } else {
      const globIgnore = ["**/node_modules/**", "**/dist/**", "**/.git/**"];
      if (exclude) {
        const excludePatterns = exclude.split(",").map((p) => p.trim());
        globIgnore.push(...excludePatterns);
      }
      files = await fastGlob(globPattern, {
        cwd: searchPath,
        absolute: true,
        onlyFiles: true,
        dot: hidden,
        ignore: globIgnore
      });
    }
    for (const file of files) {
      if (results.length >= maxResults) {
        break;
      }
      stats.filesSearched++;
      try {
        const content = await fs.readFile(file, "utf-8");
        const lines = content.split("\n");
        let fileHasMatch = false;
        if (filesOnly) {
          if (searchRegex.test(content)) {
            results.push({
              file,
              line: 0,
              column: 0,
              text: path.basename(file),
              match: ""
            });
            fileHasMatch = true;
          }
        } else {
          for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            if (results.length >= maxResults) {
              break;
            }
            const line = lines[lineNum];
            searchRegex.lastIndex = 0;
            let match;
            while ((match = searchRegex.exec(line)) !== null) {
              if (results.length >= maxResults) {
                break;
              }
              const result = {
                file,
                line: lineNum + 1,
                column: match.index + 1,
                text: line.trim(),
                match: match[0]
              };
              results.push(result);
              fileHasMatch = true;
              stats.totalMatches++;
              if (contextLines > 0) {
                for (let i = Math.max(0, lineNum - contextLines); i < lineNum; i++) {
                  results.push({
                    file,
                    line: i + 1,
                    column: 0,
                    text: lines[i].trim(),
                    match: "[context]"
                  });
                }
                for (let i = lineNum + 1; i <= Math.min(lines.length - 1, lineNum + contextLines); i++) {
                  results.push({
                    file,
                    line: i + 1,
                    column: 0,
                    text: lines[i].trim(),
                    match: "[context]"
                  });
                }
              }
              if (!searchRegex.global) break;
            }
          }
        }
        if (fileHasMatch) {
          stats.filesMatched++;
        }
      } catch (e) {
        continue;
      }
    }
    stats.elapsedMs = Date.now() - startTime;
    let output = "";
    if (results.length === 0) {
      output = `No matches found for pattern "${pattern}"`;
      if (files.length === 0) {
        output += `
No files matched glob pattern "${globPattern}" in ${searchPath}`;
      } else {
        output += `
Searched ${files.length} file${files.length === 1 ? "" : "s"}`;
      }
    } else {
      if (filesOnly) {
        const uniqueFiles = [...new Set(results.map((r) => r.file))];
        output = uniqueFiles.map((f) => path.relative(process.cwd(), f)).join("\n");
        output += `

Found ${uniqueFiles.length} file${uniqueFiles.length === 1 ? "" : "s"}`;
      } else {
        let currentFile = "";
        for (const result of results) {
          const relativeFile = path.relative(process.cwd(), result.file);
          if (currentFile !== result.file) {
            if (currentFile !== "") {
              output += "\n";
            }
            output += `
${relativeFile}:
`;
            currentFile = result.file;
          }
          if (result.match === "[context]") {
            output += `  ${result.line}: ${result.text}
`;
          } else {
            output += `  ${result.line}:${result.column}: ${result.text}
`;
          }
        }
        if (results.length >= maxResults) {
          output += `

(Showing first ${maxResults} results)`;
        }
      }
    }
    if (showStats) {
      output += "\n\n--- Search Statistics ---";
      output += `
Files searched: ${stats.filesSearched}`;
      output += `
Files with matches: ${stats.filesMatched}`;
      if (!filesOnly) {
        output += `
Total matches: ${stats.totalMatches}`;
      }
      output += `
Time elapsed: ${stats.elapsedMs}ms`;
    }
    return {
      success: true,
      output,
      data: {
        results,
        stats
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Search failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}).build();
export {
  index_default as default
};
