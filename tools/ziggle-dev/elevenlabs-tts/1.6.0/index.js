// ../tool-repo/src/index.ts
import { createTool, ToolCategory, ToolCapability } from "@ziggler/clanker";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import { spawn } from "child_process";
var execAsync = promisify(exec);
var hookEnabled = false;
var apiKey;
var voiceId = "4uaHeMW5G2O8QTk52a2n";
var modelId = "eleven_turbo_v2_5";
var outputDir;
var settingsPath;
var activeAudioProcesses = [];
var AVAILABLE_MODELS = [
  { id: "eleven_turbo_v2_5", name: "Eleven Turbo v2.5 (Latest, fastest)" },
  { id: "eleven_turbo_v2", name: "Eleven Turbo v2" },
  { id: "eleven_multilingual_v2", name: "Eleven Multilingual v2" },
  { id: "eleven_monolingual_v1", name: "Eleven Monolingual v1" },
  { id: "eleven_multilingual_v1", name: "Eleven Multilingual v1" }
];
var AVAILABLE_VOICES = [
  { id: "4uaHeMW5G2O8QTk52a2n", name: "Clanker" },
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
var index_default = createTool().id("elevenlabs_tts").name("ElevenLabs TTS").description("ElevenLabs TTS with two modes: 1) Speak text directly with specific voices (Clanker, Sarah, Josh, Rachel, Clyde, Emily, Adam, and 40+ more). 2) Enable passive mode to auto-speak all Clanker messages. Real-time streaming with instant playback.").category(ToolCategory.Utility).capabilities(ToolCapability.NetworkAccess, ToolCapability.SystemExecute).tags("elevenlabs", "tts", "text-to-speech", "audio", "voice", "hook").stringArg("action", "Action to perform: speak, enable, disable, or status", {
  required: true,
  enum: ["speak", "enable", "disable", "status"]
}).stringArg("text", "Text to speak (for speak action)", {
  required: false
}).stringArg("voice", `Voice name: ${AVAILABLE_VOICES.slice(0, 8).map((v) => v.name).join(", ")}, and ${AVAILABLE_VOICES.length - 8} more`, {
  required: false,
  enum: AVAILABLE_VOICES.map((v) => v.name)
}).stringArg("api_key", "ElevenLabs API key (will prompt if not provided)", {
  required: false
}).stringArg("voice_id", "ElevenLabs voice ID to use", {
  required: false,
  default: "4uaHeMW5G2O8QTk52a2n"
  // Clanker voice
}).stringArg("model_id", "ElevenLabs model to use", {
  required: false,
  default: "eleven_turbo_v2_5",
  enum: ["eleven_turbo_v2_5", "eleven_turbo_v2", "eleven_multilingual_v2", "eleven_monolingual_v1", "eleven_multilingual_v1"]
}).booleanArg("auto_play", "Automatically play audio after generation", {
  required: false,
  default: true
}).onInitialize(async (context) => {
  var _a, _b, _c, _d, _e;
  (_a = context.logger) == null ? void 0 : _a.info("ELEVENLABS TTS INITIALIZING...");
  outputDir = path.join(os.tmpdir(), "clanker-tts");
  await fs.mkdir(outputDir, { recursive: true });
  (_b = context.logger) == null ? void 0 : _b.debug(`TTS output directory: ${outputDir}`);
  settingsPath = path.join(os.homedir(), ".clanker", "settings.json");
  const settings = await loadToolSettings();
  (_c = context.logger) == null ? void 0 : _c.info("Loaded settings:", JSON.stringify(settings));
  if (settings) {
    if (settings.apiKey) apiKey = settings.apiKey;
    if (settings.voiceId) voiceId = settings.voiceId;
    if (settings.modelId) modelId = settings.modelId;
    if (settings.enabled) {
      hookEnabled = settings.enabled;
      (_d = context.logger) == null ? void 0 : _d.info("TTS is enabled in settings but hook installation is deferred");
    }
  }
  (_e = context.logger) == null ? void 0 : _e.info("ELEVENLABS TTS INITIALIZATION COMPLETE");
}).execute(async (args, context) => {
  const { action, api_key, voice_id, model_id, auto_play, text, voice } = args;
  switch (action) {
    case "speak":
      return await speakText(text, voice || void 0, api_key || void 0, model_id || void 0, context);
    case "enable":
      return await enableHook(api_key || void 0, voice_id || void 0, model_id || void 0, auto_play !== void 0 ? auto_play : true, context);
    case "disable":
      return await disableHook(context);
    case "status":
      return await getStatus(context);
    case "speak_message":
      const { content, role } = args;
      if (role !== "assistant" || !content) {
        return {
          success: true,
          output: "Skipped non-assistant message"
        };
      }
      return await handleTTSHook({ content, role }, context);
    default:
      return {
        success: false,
        error: `Unknown action: ${action}`
      };
  }
}).examples([
  {
    description: "Speak text with default voice",
    arguments: {
      action: "speak",
      text: "Hello world!"
    },
    result: "Successfully spoke text using voice: Clanker"
  },
  {
    description: "Speak text with specific voice",
    arguments: {
      action: "speak",
      text: "Welcome to ElevenLabs TTS!",
      voice: "Josh"
    },
    result: "Successfully spoke text using voice: Josh"
  },
  {
    description: `Speak with a different voice (Available: ${AVAILABLE_VOICES.slice(0, 10).map((v) => v.name).join(", ")}, and more...)`,
    arguments: {
      action: "speak",
      text: "This is Rachel speaking!",
      voice: "Rachel"
    },
    result: "Successfully spoke text using voice: Rachel"
  },
  {
    description: "Enable passive TTS for all messages",
    arguments: {
      action: "enable"
    },
    result: "TTS hook enabled successfully"
  },
  {
    description: "Disable passive TTS",
    arguments: {
      action: "disable"
    },
    result: "TTS hook disabled. All playing audio has been stopped immediately."
  },
  {
    description: "Check TTS status",
    arguments: {
      action: "status"
    },
    result: "Shows current TTS configuration"
  }
]).build();
async function speakText(text, voiceName, apiKeyInput, modelIdInput, context) {
  var _a, _b, _c, _d;
  if (!text || text.trim().length === 0) {
    return {
      success: false,
      error: "Text is required for speak action"
    };
  }
  let finalApiKey = apiKeyInput || apiKey;
  if (!finalApiKey) {
    finalApiKey = await getApiKey(context) || "";
    if (!finalApiKey) {
      return {
        success: false,
        error: "API key is required. Get one at https://elevenlabs.io"
      };
    }
  }
  let finalVoiceId = voiceId;
  if (voiceName) {
    const selectedVoice = AVAILABLE_VOICES.find((v) => v.name.toLowerCase() === voiceName.toLowerCase());
    if (selectedVoice) {
      finalVoiceId = selectedVoice.id;
    } else {
      return {
        success: false,
        error: `Voice "${voiceName}" not found. Available voices: ${AVAILABLE_VOICES.map((v) => v.name).join(", ")}`
      };
    }
  }
  const finalModelId = modelIdInput || modelId;
  const originalApiKey = apiKey;
  const originalVoiceId = voiceId;
  const originalModelId = modelId;
  try {
    apiKey = finalApiKey;
    voiceId = finalVoiceId;
    modelId = finalModelId;
    (_a = context.logger) == null ? void 0 : _a.info(`Speaking text with voice: ${voiceName || "default"} (${finalVoiceId})`);
    await streamSpeech(text, context);
    return {
      success: true,
      output: `Successfully spoke text using voice: ${voiceName || ((_b = AVAILABLE_VOICES.find((v) => v.id === finalVoiceId)) == null ? void 0 : _b.name) || "unknown"}`,
      data: {
        text: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
        voice: voiceName || ((_c = AVAILABLE_VOICES.find((v) => v.id === finalVoiceId)) == null ? void 0 : _c.name),
        voiceId: finalVoiceId
      }
    };
  } catch (error) {
    (_d = context.logger) == null ? void 0 : _d.error("Failed to speak text:", error);
    return {
      success: false,
      error: `Failed to speak text: ${error instanceof Error ? error.message : String(error)}`
    };
  } finally {
    apiKey = originalApiKey;
    voiceId = originalVoiceId;
    modelId = originalModelId;
  }
}
async function enableHook(apiKeyInput, voiceIdInput, modelIdInput, autoPlay, context) {
  var _a, _b, _c, _d;
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
  let finalModelId = modelIdInput || modelId;
  if (!finalModelId) {
    const savedSettings = await loadToolSettings();
    if (savedSettings == null ? void 0 : savedSettings.modelId) {
      finalModelId = savedSettings.modelId;
    } else {
      finalModelId = "eleven_turbo_v2_5";
      (_a = context.logger) == null ? void 0 : _a.info("Using default model: Eleven Turbo v2.5");
    }
  }
  let finalVoiceId = voiceIdInput || voiceId;
  if (!finalVoiceId) {
    const savedSettings = await loadToolSettings();
    if (savedSettings == null ? void 0 : savedSettings.voiceId) {
      finalVoiceId = savedSettings.voiceId;
    } else {
      finalVoiceId = "4uaHeMW5G2O8QTk52a2n";
      (_b = context.logger) == null ? void 0 : _b.info("Using default voice: Clanker");
    }
  }
  apiKey = finalApiKey;
  voiceId = finalVoiceId;
  modelId = finalModelId;
  hookEnabled = true;
  const finalAutoPlay = autoPlay !== void 0 ? autoPlay : true;
  await saveToolSettings({
    apiKey,
    voiceId,
    modelId,
    enabled: true,
    autoPlay: finalAutoPlay
  });
  const ttsState = context.sharedState.namespace("elevenlabs-tts");
  const existingHookId = ttsState.get("hookId");
  if (existingHookId) {
    (_c = context.logger) == null ? void 0 : _c.warn("Hook already installed, removing old hook first");
    await removeHook(context);
  }
  await installHook(context);
  (_d = context.logger) == null ? void 0 : _d.info("ElevenLabs TTS hook enabled");
  return {
    success: true,
    output: `TTS hook enabled successfully!
Voice ID: ${voiceId}
Model: ${modelId}
Auto-play: ${finalAutoPlay ? "enabled" : "disabled"}

All Clanker messages will now be converted to speech.`,
    data: {
      enabled: true,
      voiceId,
      modelId,
      autoPlay: finalAutoPlay
    }
  };
}
async function disableHook(context) {
  var _a, _b, _c;
  hookEnabled = false;
  (_a = context.logger) == null ? void 0 : _a.info(`Stopping ${activeAudioProcesses.length} active audio processes...`);
  for (const process of activeAudioProcesses) {
    try {
      process.kill("SIGTERM");
      setTimeout(() => {
        if (!process.killed) {
          process.kill("SIGKILL");
        }
      }, 100);
    } catch (error) {
      (_b = context.logger) == null ? void 0 : _b.error(`Failed to kill audio process: ${error}`);
    }
  }
  activeAudioProcesses = [];
  const ttsState = context.sharedState.namespace("elevenlabs-tts");
  ttsState.set("activePromises", []);
  const settings = await loadToolSettings() || {};
  await saveToolSettings({
    ...settings,
    enabled: false
  });
  await removeHook(context);
  (_c = context.logger) == null ? void 0 : _c.info("ElevenLabs TTS hook disabled and all audio stopped");
  return {
    success: true,
    output: "TTS hook disabled. All playing audio has been stopped immediately."
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
async function streamSpeech(text, context) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  (_a = context.logger) == null ? void 0 : _a.info(`streamSpeech called with text length: ${text.length}`);
  const currentApiKey = await getApiKey(context);
  if (!currentApiKey) {
    (_b = context.logger) == null ? void 0 : _b.error("No API key found!");
    throw new Error("API key not configured");
  }
  (_c = context.logger) == null ? void 0 : _c.info("API key found");
  const cleanText = text.replace(/```[\s\S]*?```/g, "").replace(/[*_~`#]/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
  if (!cleanText) {
    (_d = context.logger) == null ? void 0 : _d.debug("No speakable text after cleaning");
    return;
  }
  (_e = context.logger) == null ? void 0 : _e.info(`Clean text length: ${cleanText.length}, preview: "${cleanText.substring(0, 50)}..."`);
  (_f = context.logger) == null ? void 0 : _f.info("Synthesizing...");
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
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
      },
      optimize_streaming_latency: 1
      // Maximum optimization for lowest latency
    })
  });
  if (!response.ok) {
    const error = await response.text();
    (_g = context.logger) == null ? void 0 : _g.error(`ElevenLabs API error: ${response.status} - ${error}`);
    throw new Error(`ElevenLabs streaming API error: ${response.status} - ${error}`);
  }
  (_h = context.logger) == null ? void 0 : _h.info("ElevenLabs API response OK, starting audio playback...");
  await streamAudioPlayback(response, context);
  (_i = context.logger) == null ? void 0 : _i.info("Audio playback completed");
}
async function streamToTempFileAndPlay(response, context) {
  var _a;
  const tempFile = path.join(outputDir, `stream_${Date.now()}.mp3`);
  try {
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(tempFile, buffer);
    await playAudio(tempFile, context);
    await fs.unlink(tempFile).catch(() => {
    });
  } catch (error) {
    (_a = context.logger) == null ? void 0 : _a.error("Fallback playback failed:", error);
    throw error;
  }
}
async function streamAudioPlayback(response, context) {
  var _a, _b, _c, _d, _e, _f;
  const platform2 = os.platform();
  let playerProcess;
  (_a = context.logger) == null ? void 0 : _a.info(`Starting streaming audio playback on ${platform2}`);
  try {
    switch (platform2) {
      case "darwin":
        try {
          await execAsync("which mpg123");
          playerProcess = spawn("mpg123", ["-q", "-"]);
          (_b = context.logger) == null ? void 0 : _b.debug("Using mpg123 for streaming playback");
        } catch {
          try {
            await execAsync("which play");
            playerProcess = spawn("play", ["-q", "-t", "mp3", "-"]);
            (_c = context.logger) == null ? void 0 : _c.debug("Using sox play for streaming playback");
          } catch {
            try {
              await execAsync("which ffplay");
              playerProcess = spawn("ffplay", ["-nodisp", "-autoexit", "-loglevel", "quiet", "-i", "pipe:0"]);
              (_d = context.logger) == null ? void 0 : _d.debug("Using ffplay for streaming playback");
            } catch {
              (_e = context.logger) == null ? void 0 : _e.warn("No streaming audio player found (mpg123, sox, or ffplay). Install one with: brew install mpg123");
              return await streamToTempFileAndPlay(response, context);
            }
          }
        }
        break;
      case "linux":
        try {
          await execAsync("which mpg123");
          playerProcess = spawn("mpg123", ["-"]);
        } catch {
          try {
            await execAsync("which play");
            playerProcess = spawn("play", ["-t", "mp3", "-"]);
          } catch {
            try {
              await execAsync("which ffplay");
              playerProcess = spawn("ffplay", ["-nodisp", "-autoexit", "-i", "pipe:0"]);
            } catch {
              throw new Error("No suitable audio player found (mpg123, play, or ffplay)");
            }
          }
        }
        break;
      case "win32":
        playerProcess = spawn("ffplay", ["-nodisp", "-autoexit", "-i", "pipe:0"]);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform2}`);
    }
    activeAudioProcesses.push(playerProcess);
    playerProcess.on("error", (error) => {
      var _a2;
      (_a2 = context.logger) == null ? void 0 : _a2.error(`Audio player error: ${error.message}`);
    });
    playerProcess.stderr.on("data", (data) => {
      var _a2;
      (_a2 = context.logger) == null ? void 0 : _a2.debug(`Audio player stderr: ${data.toString()}`);
    });
    if (response.body) {
      const reader = response.body.getReader();
      const processChunk = async () => {
        var _a2;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!playerProcess.stdin.destroyed) {
              playerProcess.stdin.write(value);
            }
          }
        } catch (error) {
          (_a2 = context.logger) == null ? void 0 : _a2.error("Error reading stream:", error);
        } finally {
          playerProcess.stdin.end();
        }
      };
      await processChunk();
      await new Promise((resolve, reject) => {
        playerProcess.on("close", (code) => {
          var _a2;
          activeAudioProcesses = activeAudioProcesses.filter((p) => p !== playerProcess);
          if (code === 0) {
            (_a2 = context.logger) == null ? void 0 : _a2.info("Streaming playback completed successfully");
            resolve(void 0);
          } else {
            reject(new Error(`Player exited with code ${code}`));
          }
        });
      });
    }
  } catch (error) {
    (_f = context.logger) == null ? void 0 : _f.error(`Streaming playback failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
async function playAudio(audioFile, context) {
  var _a, _b, _c, _d, _e;
  const platform2 = os.platform();
  let command;
  (_a = context.logger) == null ? void 0 : _a.info(`Attempting to play audio on ${platform2}: ${audioFile}`);
  try {
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
            try {
              await execAsync("which paplay");
              command = `paplay "${audioFile}"`;
            } catch {
              command = `aplay "${audioFile}"`;
            }
          }
        }
        break;
      case "win32":
        const escapedPath = audioFile.replace(/'/g, "''");
        command = `powershell -NoProfile -Command "Add-Type -AssemblyName System.Media; $player = New-Object System.Media.SoundPlayer('${escapedPath}'); $player.PlaySync()"`;
        break;
      default:
        throw new Error(`Unsupported platform: ${platform2}`);
    }
    (_b = context.logger) == null ? void 0 : _b.debug(`Playing audio with command: ${command}`);
    const result = await execAsync(command);
    (_c = context.logger) == null ? void 0 : _c.info("Audio playback completed successfully");
    if (result.stderr) {
      (_d = context.logger) == null ? void 0 : _d.warn(`Audio playback stderr: ${result.stderr}`);
    }
  } catch (error) {
    (_e = context.logger) == null ? void 0 : _e.error(`Failed to play audio: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Audio playback failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
async function installHook(context) {
  var _a, _b, _c, _d, _e;
  if (!context.hooks) {
    (_a = context.logger) == null ? void 0 : _a.error("Hook system not available in context");
    throw new Error("Hook system not available in context");
  }
  (_b = context.logger) == null ? void 0 : _b.info("Installing ElevenLabs TTS hook...");
  const hookId = context.hooks.register({
    name: "ElevenLabs TTS for Assistant",
    description: "Speaks assistant messages using ElevenLabs TTS",
    event: "PostMessage",
    matcher: (role) => role === "assistant",
    priority: 10,
    handler: async (input, hookContext) => {
      var _a2, _b2, _c2, _d2, _e2;
      (_b2 = context.logger) == null ? void 0 : _b2.info(`TTS HOOK TRIGGERED! Message role: ${input.role}, has content: ${!!input.content}, content length: ${((_a2 = input.content) == null ? void 0 : _a2.length) || 0}`);
      (_c2 = context.logger) == null ? void 0 : _c2.info(`Hook input keys:`, Object.keys(input).join(", "));
      if (input.role !== "assistant" || !input.content || input.content.trim().length === 0) {
        (_d2 = context.logger) == null ? void 0 : _d2.info("Skipping non-assistant message or no content");
        return { continue: true };
      }
      (_e2 = context.logger) == null ? void 0 : _e2.info(`PROCESSING ASSISTANT MESSAGE FOR TTS! Content: "${input.content.substring(0, 100)}..."`);
      return await handleTTSHook(input, context);
    },
    aiDescription: "Converts assistant text responses to speech using ElevenLabs API",
    capabilities: ["audio-generation", "text-to-speech"]
  });
  const ttsState = context.sharedState.namespace("elevenlabs-tts");
  ttsState.set("hookId", hookId);
  (_c = context.logger) == null ? void 0 : _c.warn("Note: TTS hook is registered for this session only. To make it persistent, configure it in your .clanker/settings.json file.");
  const registeredHooks = context.hooks.getHooks("PostMessage");
  (_d = context.logger) == null ? void 0 : _d.info(`Registered PostMessage hooks: ${registeredHooks.map((h) => h.id).join(", ")}`);
  (_e = context.logger) == null ? void 0 : _e.info(`TTS hook registered with ID: ${hookId}`);
}
async function handleTTSHook(input, context) {
  var _a;
  (_a = context.logger) == null ? void 0 : _a.info("Processing assistant message for TTS");
  const ttsPromise = (async () => {
    var _a2, _b, _c, _d, _e, _f;
    try {
      const settings = await loadToolSettings();
      (_a2 = context.logger) == null ? void 0 : _a2.debug(`TTS settings - autoPlay: ${settings == null ? void 0 : settings.autoPlay}`);
      if ((settings == null ? void 0 : settings.autoPlay) !== false) {
        (_b = context.logger) == null ? void 0 : _b.info("Starting TTS stream immediately...");
        await streamSpeech(input.content, context);
        (_c = context.logger) == null ? void 0 : _c.info("TTS playback completed");
      } else {
        (_d = context.logger) == null ? void 0 : _d.info("Auto-play disabled, generating audio file only");
        const audioFile = await generateSpeech(input.content, context);
        (_e = context.logger) == null ? void 0 : _e.info(`Audio file generated: ${audioFile}`);
      }
    } catch (error) {
      (_f = context.logger) == null ? void 0 : _f.error("TTS streaming or generation failed:", error);
    }
  })();
  const ttsState = context.sharedState.namespace("elevenlabs-tts");
  const promises = ttsState.get("activePromises") || [];
  promises.push(ttsPromise);
  ttsState.set("activePromises", promises);
  return {
    continue: true,
    data: {
      ttsStarted: true,
      promise: ttsPromise
    }
  };
}
async function removeHook(context) {
  var _a, _b;
  if (context.hooks) {
    const ttsState = context.sharedState.namespace("elevenlabs-tts");
    const hookId = ttsState.get("hookId");
    if (hookId) {
      context.hooks.unregister(hookId);
      ttsState.delete("hookId");
      (_a = context.logger) == null ? void 0 : _a.info(`TTS hook ${hookId} unregistered`);
    } else {
      (_b = context.logger) == null ? void 0 : _b.warn("No hook ID found in shared state");
    }
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
export {
  index_default as default
};
