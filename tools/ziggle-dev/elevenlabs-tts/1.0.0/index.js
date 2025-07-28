// ../tool-repo/src/index.ts
import { createTool, ToolCategory, ToolCapability } from "@ziggler/clanker";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
var execAsync = promisify(exec);
var hookEnabled = false;
var apiKey;
var voiceId = "EXAVITQu4vr4xnSDxMaL";
var modelId = "eleven_monolingual_v1";
var outputDir;
var index_default = createTool().id("elevenlabs_tts").name("ElevenLabs TTS").description("ElevenLabs text-to-speech integration that hooks into Clanker to playback all messages").category(ToolCategory.Utility).capabilities(ToolCapability.NetworkAccess, ToolCapability.SystemExecute).tags("elevenlabs", "tts", "text-to-speech", "audio", "voice", "hook").stringArg("action", "Action to perform: enable, disable, or status", {
  required: true,
  enum: ["enable", "disable", "status", "test"]
}).stringArg("api_key", "ElevenLabs API key (required for enable)", {
  required: false
}).stringArg("voice_id", "ElevenLabs voice ID to use", {
  required: false,
  default: "EXAVITQu4vr4xnSDxMaL"
  // Sarah voice
}).stringArg("model_id", "ElevenLabs model to use", {
  required: false,
  default: "eleven_monolingual_v1",
  enum: ["eleven_monolingual_v1", "eleven_multilingual_v1", "eleven_multilingual_v2"]
}).booleanArg("auto_play", "Automatically play audio after generation", {
  required: false,
  default: true
}).onInitialize(async (context) => {
  var _a;
  outputDir = path.join(os.tmpdir(), "clanker-tts");
  await fs.mkdir(outputDir, { recursive: true });
  (_a = context.logger) == null ? void 0 : _a.debug(`TTS output directory: ${outputDir}`);
  const configPath = path.join(os.homedir(), ".clanker", "elevenlabs-config.json");
  try {
    const config = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(config);
    if (parsed.apiKey) apiKey = parsed.apiKey;
    if (parsed.voiceId) voiceId = parsed.voiceId;
    if (parsed.modelId) modelId = parsed.modelId;
    if (parsed.enabled) hookEnabled = parsed.enabled;
  } catch {
  }
}).execute(async (args, context) => {
  const { action, api_key, voice_id, model_id, auto_play } = args;
  switch (action) {
    case "enable":
      return await enableHook(api_key, voice_id, model_id, auto_play, context);
    case "disable":
      return await disableHook(context);
    case "status":
      return await getStatus(context);
    case "test":
      return await testTTS("Hello! This is a test of the ElevenLabs text-to-speech integration.", auto_play, context);
    default:
      return {
        success: false,
        error: `Unknown action: ${action}`
      };
  }
}).examples([
  {
    description: "Enable TTS with your API key",
    arguments: {
      action: "enable",
      api_key: "your-api-key-here"
    },
    result: "TTS hook enabled successfully"
  },
  {
    description: "Test TTS functionality",
    arguments: {
      action: "test"
    },
    result: "Plays test message"
  },
  {
    description: "Disable TTS hook",
    arguments: {
      action: "disable"
    },
    result: "TTS hook disabled"
  },
  {
    description: "Check TTS status",
    arguments: {
      action: "status"
    },
    result: "Shows current TTS configuration"
  }
]).build();
async function enableHook(apiKeyInput, voiceIdInput, modelIdInput, autoPlay, context) {
  var _a;
  if (!apiKeyInput) {
    return {
      success: false,
      error: "API key is required to enable TTS. Get one at https://elevenlabs.io"
    };
  }
  apiKey = apiKeyInput;
  voiceId = voiceIdInput;
  modelId = modelIdInput;
  hookEnabled = true;
  const configPath = path.join(os.homedir(), ".clanker", "elevenlabs-config.json");
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify({
    apiKey,
    voiceId,
    modelId,
    enabled: true,
    autoPlay
  }, null, 2));
  await installHook(context);
  (_a = context.logger) == null ? void 0 : _a.info("ElevenLabs TTS hook enabled");
  return {
    success: true,
    output: `TTS hook enabled successfully!
Voice ID: ${voiceId}
Model: ${modelId}
Auto-play: ${autoPlay ? "enabled" : "disabled"}

All Clanker messages will now be converted to speech.`,
    data: {
      enabled: true,
      voiceId,
      modelId,
      autoPlay
    }
  };
}
async function disableHook(context) {
  var _a;
  hookEnabled = false;
  const configPath = path.join(os.homedir(), ".clanker", "elevenlabs-config.json");
  try {
    const config = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(config);
    parsed.enabled = false;
    await fs.writeFile(configPath, JSON.stringify(parsed, null, 2));
  } catch {
  }
  await removeHook(context);
  (_a = context.logger) == null ? void 0 : _a.info("ElevenLabs TTS hook disabled");
  return {
    success: true,
    output: "TTS hook disabled. Messages will no longer be converted to speech."
  };
}
async function getStatus(context) {
  const configPath = path.join(os.homedir(), ".clanker", "elevenlabs-config.json");
  let config = {};
  try {
    const configData = await fs.readFile(configPath, "utf-8");
    config = JSON.parse(configData);
  } catch {
  }
  const status = config.enabled ? "enabled" : "disabled";
  const hasApiKey = !!config.apiKey;
  return {
    success: true,
    output: `ElevenLabs TTS Status:
Hook: ${status}
API Key: ${hasApiKey ? "configured" : "not configured"}
Voice ID: ${config.voiceId || "default"}
Model: ${config.modelId || "eleven_monolingual_v1"}
Auto-play: ${config.autoPlay !== false ? "enabled" : "disabled"}
Audio output: ${outputDir}`,
    data: {
      enabled: config.enabled || false,
      hasApiKey,
      voiceId: config.voiceId,
      modelId: config.modelId,
      autoPlay: config.autoPlay !== false
    }
  };
}
async function testTTS(text, autoPlay, context) {
  if (!apiKey) {
    return {
      success: false,
      error: 'API key not configured. Run with action="enable" first.'
    };
  }
  try {
    const audioFile = await generateSpeech(text, context);
    if (autoPlay) {
      await playAudio(audioFile, context);
    }
    return {
      success: true,
      output: `Test speech generated successfully!
Audio file: ${audioFile}`,
      data: {
        audioFile,
        played: autoPlay
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `TTS test failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
async function generateSpeech(text, context) {
  var _a, _b, _c;
  if (!apiKey) {
    throw new Error("API key not configured");
  }
  const cleanText = text.replace(/```[\s\S]*?```/g, "").replace(/[*_~`#]/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
  if (!cleanText) {
    throw new Error("No speakable text after cleaning");
  }
  const hash = crypto.createHash("md5").update(cleanText).digest("hex");
  const audioFile = path.join(outputDir, `${hash}.mp3`);
  try {
    await fs.access(audioFile);
    (_a = context.logger) == null ? void 0 : _a.debug("Audio file already exists, using cached version");
    return audioFile;
  } catch {
  }
  (_b = context.logger) == null ? void 0 : _b.debug(`Generating speech for: ${cleanText.substring(0, 50)}...`);
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Accept": "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": apiKey
    },
    body: JSON.stringify({
      text: cleanText,
      model_id: modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    })
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(audioFile, buffer);
  (_c = context.logger) == null ? void 0 : _c.info(`Speech generated: ${audioFile}`);
  return audioFile;
}
async function playAudio(audioFile, context) {
  var _a;
  const platform2 = os.platform();
  let command;
  switch (platform2) {
    case "darwin":
      command = `afplay "${audioFile}"`;
      break;
    case "linux":
      try {
        await execAsync("which mpg123");
        command = `mpg123 -q "${audioFile}"`;
      } catch {
        try {
          await execAsync("which play");
          command = `play -q "${audioFile}"`;
        } catch {
          command = `aplay "${audioFile}"`;
        }
      }
      break;
    case "win32":
      command = `powershell -c "(New-Object Media.SoundPlayer '${audioFile}').PlaySync()"`;
      break;
    default:
      throw new Error(`Unsupported platform: ${platform2}`);
  }
  (_a = context.logger) == null ? void 0 : _a.debug(`Playing audio with: ${command}`);
  await execAsync(command);
}
async function installHook(context) {
  var _a;
  const hookScript = `
// ElevenLabs TTS Hook
if (typeof global.clankerHooks === 'undefined') {
    global.clankerHooks = {};
}

global.clankerHooks.elevenlabsTTS = {
    onMessage: async (message) => {
        try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            // Call the elevenlabs_tts tool to generate speech
            await execAsync(\`clanker -p "use elevenlabs_tts to test '\${message.replace(/'/g, "\\'")}' "\`);
        } catch (error) {
            console.error('TTS hook error:', error);
        }
    }
};
`;
  const hooksDir = path.join(os.homedir(), ".clanker", "hooks");
  await fs.mkdir(hooksDir, { recursive: true });
  await fs.writeFile(path.join(hooksDir, "elevenlabs-tts.js"), hookScript);
  (_a = context.logger) == null ? void 0 : _a.info("TTS hook installed");
}
async function removeHook(context) {
  var _a;
  const hookPath = path.join(os.homedir(), ".clanker", "hooks", "elevenlabs-tts.js");
  try {
    await fs.unlink(hookPath);
    (_a = context.logger) == null ? void 0 : _a.info("TTS hook removed");
  } catch {
  }
}
export {
  index_default as default
};
