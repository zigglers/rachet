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
var modelId = "eleven_turbo_v2_5";
var outputDir;
var settingsPath;
var AVAILABLE_MODELS = [
  { id: "eleven_turbo_v2_5", name: "Eleven Turbo v2.5 (Latest, fastest)" },
  { id: "eleven_turbo_v2", name: "Eleven Turbo v2" },
  { id: "eleven_multilingual_v2", name: "Eleven Multilingual v2" },
  { id: "eleven_monolingual_v1", name: "Eleven Monolingual v1" },
  { id: "eleven_multilingual_v1", name: "Eleven Multilingual v1" }
];
var AVAILABLE_VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel" },
  { id: "2EiwWnXFnvU5JabPnv8n", name: "Clyde" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi" },
  { id: "CYw3kZ02Hs0563khs1Fj", name: "Dave" },
  { id: "D38z5RcWu1voky8WS1ja", name: "Fin" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni" },
  { id: "GBv7mTt0atIp3Br8iCZE", name: "Thomas" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George" },
  { id: "LcfcDJNUP1GQjkzn1xUU", name: "Emily" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli" },
  { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum" },
  { id: "ODq5zmih8GrVes37Dizd", name: "Patrick" },
  { id: "SOYHLrjzK2X1ezoPC6cr", name: "Harry" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam" },
  { id: "ThT5KcBeYPX3keUQqHPh", name: "Dorothy" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold" },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Alice" },
  { id: "Yko7PKHZNXotIFUBG7I9", name: "Matilda" },
  { id: "ZQe5CZNOzWyzPSCn5a3c", name: "James" },
  { id: "Zlb1dXrM653N07WRdFW3", name: "Joseph" },
  { id: "bVMeCyTHy58xNoL34h3p", name: "Jeremy" },
  { id: "flq6f7yk4E4fJM5XTYuZ", name: "Michael" },
  { id: "g5CIjZEefAph4nQFvHAz", name: "Ethan" },
  { id: "jBpfuIE2acCO8z3wKNLl", name: "Gigi" },
  { id: "jsCqWAovK2LkecY7zXl4", name: "Freya" },
  { id: "oWAxZDx7w5VEj9dCyTzz", name: "Grace" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel" },
  { id: "pMsXgVXv3BLzUgSXRplE", name: "Serena" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam" },
  { id: "t0jbNlBVZ17f02VDIeMI", name: "Jessie" },
  { id: "wViXBPUzp2ZZixB1xQuM", name: "Glinda" },
  { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam" },
  { id: "z9fAnlkpzviPz146aGWa", name: "Nicole" },
  { id: "zcAOhNBS3c14rBihAFp1", name: "Giovanni" },
  { id: "zrHiDhphv9ZnVXBqCLjz", name: "Mimi" }
];
var index_default = createTool().id("elevenlabs_tts").name("ElevenLabs TTS").description("ElevenLabs text-to-speech integration that hooks into Clanker to playback all messages. Features interactive model and voice selection using dropdown menus. Requires the input tool v1.1.0+ for prompts.").category(ToolCategory.Utility).capabilities(ToolCapability.NetworkAccess, ToolCapability.SystemExecute).tags("elevenlabs", "tts", "text-to-speech", "audio", "voice", "hook").stringArg("action", "Action to perform: enable, disable, or status", {
  required: true,
  enum: ["enable", "disable", "status", "test"]
}).stringArg("api_key", "ElevenLabs API key (will prompt if not provided)", {
  required: false
}).stringArg("voice_id", "ElevenLabs voice ID to use", {
  required: false,
  default: "EXAVITQu4vr4xnSDxMaL"
  // Sarah voice
}).stringArg("model_id", "ElevenLabs model to use", {
  required: false,
  default: "eleven_turbo_v2_5",
  enum: ["eleven_turbo_v2_5", "eleven_turbo_v2", "eleven_multilingual_v2", "eleven_monolingual_v1", "eleven_multilingual_v1"]
}).booleanArg("auto_play", "Automatically play audio after generation", {
  required: false,
  default: true
}).onInitialize(async (context) => {
  var _a;
  outputDir = path.join(os.tmpdir(), "clanker-tts");
  await fs.mkdir(outputDir, { recursive: true });
  (_a = context.logger) == null ? void 0 : _a.debug(`TTS output directory: ${outputDir}`);
  settingsPath = path.join(os.homedir(), ".clanker", "settings.json");
  const settings = await loadToolSettings();
  if (settings) {
    if (settings.apiKey) apiKey = settings.apiKey;
    if (settings.voiceId) voiceId = settings.voiceId;
    if (settings.modelId) modelId = settings.modelId;
    if (settings.enabled) hookEnabled = settings.enabled;
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
    description: "Enable TTS (will prompt for API key if needed)",
    arguments: {
      action: "enable"
    },
    result: "TTS hook enabled successfully"
  },
  {
    description: "Enable TTS with specific API key",
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
    result: "Plays test message (prompts for API key if needed)"
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
  let finalApiKey = apiKeyInput;
  if (!finalApiKey) {
    finalApiKey = await getApiKey(context) || "";
    if (!finalApiKey) {
      return {
        success: false,
        error: "API key is required to enable TTS. Get one at https://elevenlabs.io"
      };
    }
  }
  let finalModelId = modelIdInput;
  if (!finalModelId) {
    finalModelId = await selectModel(context);
    if (!finalModelId) {
      return {
        success: false,
        error: "Model selection cancelled"
      };
    }
  }
  let finalVoiceId = voiceIdInput;
  if (!finalVoiceId) {
    finalVoiceId = await selectVoice(context);
    if (!finalVoiceId) {
      return {
        success: false,
        error: "Voice selection cancelled"
      };
    }
  }
  apiKey = finalApiKey;
  voiceId = finalVoiceId;
  modelId = finalModelId;
  hookEnabled = true;
  await saveToolSettings({
    apiKey,
    voiceId,
    modelId,
    enabled: true,
    autoPlay
  });
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
  const settings = await loadToolSettings() || {};
  await saveToolSettings({
    ...settings,
    enabled: false
  });
  await removeHook(context);
  (_a = context.logger) == null ? void 0 : _a.info("ElevenLabs TTS hook disabled");
  return {
    success: true,
    output: "TTS hook disabled. Messages will no longer be converted to speech."
  };
}
async function getStatus(context) {
  var _a, _b;
  const config = await loadToolSettings() || {};
  const status = config.enabled ? "enabled" : "disabled";
  const hasApiKey = !!config.apiKey;
  const voiceName = ((_a = AVAILABLE_VOICES.find((v) => v.id === config.voiceId)) == null ? void 0 : _a.name) || config.voiceId || "not selected";
  const modelName = ((_b = AVAILABLE_MODELS.find((m) => m.id === config.modelId)) == null ? void 0 : _b.name) || config.modelId || "not selected";
  return {
    success: true,
    output: `ElevenLabs TTS Status:
Hook: ${status}
API Key: ${hasApiKey ? "configured" : "not configured"}
Voice: ${voiceName}
Model: ${modelName}
Auto-play: ${config.autoPlay !== false ? "enabled" : "disabled"}
Audio output: ${outputDir}`,
    data: {
      enabled: config.enabled || false,
      hasApiKey,
      voiceId: config.voiceId,
      voiceName,
      modelId: config.modelId,
      modelName,
      autoPlay: config.autoPlay !== false
    }
  };
}
async function testTTS(text, autoPlay, context) {
  const currentApiKey = await getApiKey(context);
  if (!currentApiKey) {
    return {
      success: false,
      error: 'API key not configured. Run with action="enable" first or provide your API key.'
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
  const currentApiKey = await getApiKey(context);
  if (!currentApiKey) {
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
      "xi-api-key": currentApiKey
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
  if (!context.hooks) {
    throw new Error("Hook system not available in context");
  }
  context.hooks.register({
    id: "elevenlabs-tts-assistant",
    name: "ElevenLabs TTS for Assistant",
    description: "Speaks assistant messages using ElevenLabs TTS",
    event: "PostMessage",
    matcher: (role) => role === "assistant",
    priority: 10,
    handler: async (input, hookContext) => {
      var _a2;
      if (input.role !== "assistant" || !input.content) {
        return { continue: true };
      }
      try {
        const audioFile = await generateSpeech(input.content, context);
        const settings = await loadToolSettings();
        if ((settings == null ? void 0 : settings.autoPlay) !== false) {
          await playAudio(audioFile, context);
        }
        return {
          continue: true,
          data: {
            audioFile,
            played: (settings == null ? void 0 : settings.autoPlay) !== false
          }
        };
      } catch (error) {
        (_a2 = context.logger) == null ? void 0 : _a2.error("TTS generation failed:", error);
        return {
          continue: true,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    },
    aiDescription: "Converts assistant text responses to speech using ElevenLabs API",
    capabilities: ["audio-generation", "text-to-speech"]
  });
  (_a = context.logger) == null ? void 0 : _a.info("TTS hook registered with new hook system");
}
async function removeHook(context) {
  var _a;
  if (context.hooks) {
    context.hooks.unregister("elevenlabs-tts-assistant");
    (_a = context.logger) == null ? void 0 : _a.info("TTS hook unregistered");
  }
}
async function loadToolSettings() {
  var _a;
  try {
    await fs.mkdir(path.dirname(settingsPath), { recursive: true });
    const settingsData = await fs.readFile(settingsPath, "utf-8");
    const settings = JSON.parse(settingsData);
    return ((_a = settings.tools) == null ? void 0 : _a.elevenlabs) || null;
  } catch {
    return null;
  }
}
async function saveToolSettings(toolSettings) {
  try {
    await fs.mkdir(path.dirname(settingsPath), { recursive: true });
    let settings = {};
    try {
      const existingData = await fs.readFile(settingsPath, "utf-8");
      settings = JSON.parse(existingData);
    } catch {
    }
    if (!settings.tools) {
      settings.tools = {};
    }
    settings.tools.elevenlabs = toolSettings;
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    throw new Error(`Failed to save settings: ${error instanceof Error ? error.message : String(error)}`);
  }
}
async function getApiKey(context) {
  var _a;
  if (apiKey) {
    return apiKey;
  }
  const settings = await loadToolSettings();
  if (settings == null ? void 0 : settings.apiKey) {
    apiKey = settings.apiKey;
    return apiKey;
  }
  try {
    const result = await context.registry.execute("input", {
      prompt: "Please enter your ElevenLabs API key:",
      title: "ElevenLabs API Key Required",
      type: "password"
    });
    if (result.success && result.output) {
      apiKey = result.output;
      await saveToolSettings({
        ...settings,
        apiKey
      });
      return apiKey;
    }
  } catch (error) {
    (_a = context.logger) == null ? void 0 : _a.error(`Failed to get API key via input tool: ${error}`);
  }
  return null;
}
async function selectModel(context) {
  var _a;
  const settings = await loadToolSettings();
  if (settings == null ? void 0 : settings.modelId) {
    return settings.modelId;
  }
  try {
    const result = await context.registry.execute("input", {
      prompt: "Select the ElevenLabs model to use:",
      title: "Model Selection",
      type: "dropdown",
      options: AVAILABLE_MODELS.map((m) => m.name),
      default_value: AVAILABLE_MODELS[0].name
    });
    if (result.success && result.output) {
      const selectedModel = AVAILABLE_MODELS.find((m) => m.name === result.output);
      return (selectedModel == null ? void 0 : selectedModel.id) || null;
    }
  } catch (error) {
    (_a = context.logger) == null ? void 0 : _a.error(`Failed to select model via input tool: ${error}`);
  }
  return null;
}
async function selectVoice(context) {
  var _a;
  const settings = await loadToolSettings();
  if (settings == null ? void 0 : settings.voiceId) {
    return settings.voiceId;
  }
  try {
    const result = await context.registry.execute("input", {
      prompt: "Select the voice to use:",
      title: "Voice Selection",
      type: "dropdown",
      options: AVAILABLE_VOICES.map((v) => v.name),
      default_value: AVAILABLE_VOICES[0].name
    });
    if (result.success && result.output) {
      const selectedVoice = AVAILABLE_VOICES.find((v) => v.name === result.output);
      return (selectedVoice == null ? void 0 : selectedVoice.id) || null;
    }
  } catch (error) {
    (_a = context.logger) == null ? void 0 : _a.error(`Failed to select voice via input tool: ${error}`);
  }
  return null;
}
export {
  index_default as default
};
