// ../tool-repo/src/index.ts
import { createTool, ToolCategory, ToolCapability } from "@ziggler/clanker";
import record from "node-record-lpcm16";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { promisify } from "util";
import { exec } from "child_process";
var execAsync = promisify(exec);
var settingsPath = path.join(os.homedir(), ".clanker", "settings.json");
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
    settings.tools.elevenlabs = {
      ...settings.tools.elevenlabs,
      ...toolSettings
    };
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}
async function getApiKey(context) {
  var _a;
  const settings = await loadToolSettings();
  if (settings == null ? void 0 : settings.apiKey) {
    return settings.apiKey;
  }
  if (context == null ? void 0 : context.registry) {
    try {
      const result = await context.registry.execute("input", {
        prompt: "Please enter your ElevenLabs API key:",
        title: "ElevenLabs API Key Required",
        type: "password"
      });
      if (result.success && result.output) {
        await saveToolSettings({ apiKey: result.output });
        return result.output;
      }
    } catch (error) {
      (_a = context.logger) == null ? void 0 : _a.error("Failed to prompt for API key:", error);
    }
  }
  return void 0;
}
async function checkSoxInstalled() {
  try {
    await execAsync("which sox");
    return true;
  } catch {
    return false;
  }
}
async function recordAudioWithSilenceDetection(maxDuration, minDuration = 0.5, silenceThreshold = "3%", silenceDuration = "1.2", context) {
  return new Promise((resolve, reject) => {
    var _a;
    const chunks = [];
    let recordingTime = 0;
    const checkInterval = 100;
    (_a = context == null ? void 0 : context.logger) == null ? void 0 : _a.info(`\u{1F534} Recording...`);
    const recording = record.record({
      sampleRate: 16e3,
      channels: 1,
      audioType: "wav",
      recorder: "sox",
      silence: silenceDuration,
      threshold: silenceThreshold,
      thresholdStart: null,
      thresholdEnd: silenceThreshold,
      keepSilence: true
    });
    const stream = recording.stream();
    let hasData = false;
    stream.on("data", (chunk) => {
      chunks.push(chunk);
      if (chunk.length > 0) {
        hasData = true;
      }
    });
    stream.on("error", (err) => {
      recording.stop();
      reject(new Error(`Recording error: ${err.message}`));
    });
    const timeoutCheck = setInterval(() => {
      var _a2;
      recordingTime += checkInterval;
      if (recordingTime >= maxDuration * 1e3) {
        clearInterval(timeoutCheck);
        recording.stop();
        (_a2 = context == null ? void 0 : context.logger) == null ? void 0 : _a2.debug("Maximum recording duration reached.");
      }
    }, checkInterval);
    stream.on("end", () => {
      var _a2, _b;
      clearInterval(timeoutCheck);
      const audioBuffer = Buffer.concat(chunks);
      if (audioBuffer.length < 1e3) {
        (_a2 = context == null ? void 0 : context.logger) == null ? void 0 : _a2.warn("Recording too short, might be just noise.");
      }
      (_b = context == null ? void 0 : context.logger) == null ? void 0 : _b.debug(`Recording complete (${(recordingTime / 1e3).toFixed(1)}s).`);
      resolve(audioBuffer);
    });
    stream.on("close", () => {
      var _a2;
      clearInterval(timeoutCheck);
      if (chunks.length > 0) {
        const audioBuffer = Buffer.concat(chunks);
        (_a2 = context == null ? void 0 : context.logger) == null ? void 0 : _a2.debug(`Recording stopped on silence detection.`);
        resolve(audioBuffer);
      }
    });
  });
}
async function recordAudioFixed(duration, context) {
  return new Promise((resolve, reject) => {
    var _a;
    const chunks = [];
    (_a = context == null ? void 0 : context.logger) == null ? void 0 : _a.info(`\u{1F534} Recording for ${duration} seconds...`);
    const recording = record.record({
      sampleRate: 16e3,
      channels: 1,
      audioType: "wav",
      recorder: "sox"
    });
    const stream = recording.stream();
    stream.on("data", (chunk) => {
      chunks.push(chunk);
    });
    stream.on("error", (err) => {
      recording.stop();
      reject(new Error(`Recording error: ${err.message}`));
    });
    setTimeout(() => {
      recording.stop();
    }, duration * 1e3);
    stream.on("end", () => {
      var _a2;
      const audioBuffer = Buffer.concat(chunks);
      (_a2 = context == null ? void 0 : context.logger) == null ? void 0 : _a2.info("Recording complete.");
      resolve(audioBuffer);
    });
  });
}
async function transcribeAudio(audioBuffer, apiKey, language = "en", context) {
  var _a, _b;
  (_a = context == null ? void 0 : context.logger) == null ? void 0 : _a.debug("Transcribing with ElevenLabs Scribe...");
  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("file", audioBuffer, {
    filename: "recording.wav",
    contentType: "audio/wav"
  });
  form.append("model_id", "scribe_v1");
  form.append("language_code", language);
  const fetch = (await import("node-fetch")).default;
  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      ...form.getHeaders()
    },
    body: form
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }
  const result = await response.json();
  (_b = context == null ? void 0 : context.logger) == null ? void 0 : _b.info(`\u{1F4DD} Transcription: "${result.text}"`);
  return result.text;
}
async function speakText(text, context, apiKey) {
  var _a, _b;
  if (!context.registry) {
    (_a = context.logger) == null ? void 0 : _a.warn("TTS not available - no registry context");
    return;
  }
  try {
    await context.registry.execute("elevenlabs_tts", {
      action: "speak",
      text,
      api_key: apiKey
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
  } catch (error) {
    (_b = context.logger) == null ? void 0 : _b.warn("Failed to speak via TTS:", error);
  }
}
var index_default = createTool().id("voice_input").name("Voice Input").description("Voice recording with intelligent silence detection and TTS integration. Records audio and transcribes using ElevenLabs Scribe API. Perfect for voice-driven interactions.").category(ToolCategory.Utility).capabilities(ToolCapability.SystemExecute, ToolCapability.NetworkAccess).tags("voice", "input", "audio", "speech", "microphone", "transcription", "stt", "elevenlabs").stringArg("action", "Action to perform: record, ask, enable_voice_mode, disable_voice_mode, status", {
  required: false,
  default: "record",
  enum: ["record", "ask", "enable_voice_mode", "disable_voice_mode", "status"]
}).stringArg("prompt", "Optional prompt to speak before recording", {
  required: false
}).numberArg("duration", "Max recording duration in seconds (1-60)", {
  required: false,
  default: 10
}).numberArg("min_duration", "Minimum recording duration before silence detection (0.5-5)", {
  required: false,
  default: 0.5
}).stringArg("language", "Language code for transcription (e.g., en, es, fr)", {
  required: false,
  default: "en"
}).stringArg("api_key", "ElevenLabs API key (will use saved key if not provided)", {
  required: false
}).booleanArg("speak_prompt", "If true, speaks the prompt using TTS", {
  required: false,
  default: true
}).booleanArg("auto_detect_silence", "Use intelligent silence detection to stop recording", {
  required: false,
  default: true
}).booleanArg("speak_response", "Speak the response via TTS", {
  required: false,
  default: false
}).stringArg("silence_threshold", "Volume threshold for silence detection (e.g., 1%, 2%, 5%)", {
  required: false,
  default: "3%"
}).stringArg("silence_duration", "Duration of silence before stopping (e.g., 0.8, 1.0, 1.5)", {
  required: false,
  default: "1.2"
}).examples([
  {
    description: "Simple voice recording",
    arguments: {
      action: "record"
    },
    result: "Records until silence detected, returns transcription"
  },
  {
    description: "Ask a question via voice",
    arguments: {
      action: "ask",
      prompt: "What would you like to do?"
    },
    result: "Speaks prompt via TTS, records response, returns transcription"
  },
  {
    description: "Enable voice mode for all interactions",
    arguments: {
      action: "enable_voice_mode"
    },
    result: "Enables voice mode - responses will be spoken via TTS"
  },
  {
    description: "Fixed duration recording",
    arguments: {
      action: "record",
      duration: 5,
      auto_detect_silence: false
    },
    result: "Records exactly 5 seconds"
  },
  {
    description: "Adjust silence detection sensitivity",
    arguments: {
      action: "record",
      silence_threshold: "1%",
      silence_duration: "1.0"
    },
    result: "More sensitive silence detection"
  }
]).execute(async (args, context) => {
  var _a, _b;
  const {
    action = "record",
    prompt,
    duration = 10,
    min_duration = 0.5,
    language = "en",
    api_key,
    speak_prompt = true,
    auto_detect_silence = true,
    speak_response = false,
    silence_threshold = "3%",
    silence_duration = "1.2"
  } = args;
  switch (action) {
    case "enable_voice_mode":
      await saveToolSettings({ autoSpeak: true });
      return {
        success: true,
        output: "Voice mode enabled. Responses will be spoken via TTS."
      };
    case "disable_voice_mode":
      await saveToolSettings({ autoSpeak: false });
      return {
        success: true,
        output: "Voice mode disabled."
      };
    case "status":
      const settings2 = await loadToolSettings();
      return {
        success: true,
        output: `Voice Input Status:
- Voice Mode: ${(settings2 == null ? void 0 : settings2.autoSpeak) ? "Enabled" : "Disabled"}
- API Key: ${(settings2 == null ? void 0 : settings2.apiKey) ? "Configured" : "Not configured"}
- Default Language: ${(settings2 == null ? void 0 : settings2.language) || "en"}`
      };
  }
  const soxInstalled = await checkSoxInstalled();
  if (!soxInstalled) {
    return {
      success: false,
      error: "SoX is required for audio recording. Please install it:\n  macOS: brew install sox\n  Linux: sudo apt-get install sox\n  Windows: choco install sox"
    };
  }
  const finalApiKey = api_key || await getApiKey(context);
  if (!finalApiKey) {
    return {
      success: false,
      error: "ElevenLabs API key is required. Please provide it or save it in settings."
    };
  }
  const settings = await loadToolSettings();
  const voiceModeEnabled = speak_response || (settings == null ? void 0 : settings.autoSpeak) || false;
  try {
    if (action === "ask") {
      if (prompt && speak_prompt && context.registry) {
        await speakText(prompt, context, finalApiKey);
      } else if (prompt) {
        (_a = context.logger) == null ? void 0 : _a.info(`\u{1F4DD} ${prompt}`);
      }
      const audioBuffer2 = auto_detect_silence ? await recordAudioWithSilenceDetection(
        duration,
        min_duration,
        silence_threshold,
        silence_duration,
        context
      ) : await recordAudioFixed(duration, context);
      const transcription2 = await transcribeAudio(
        audioBuffer2,
        finalApiKey,
        language,
        context
      );
      return {
        success: true,
        output: transcription2,
        data: {
          transcription: transcription2,
          language,
          promptSpoken: speak_prompt && !!prompt
        }
      };
    }
    if (prompt && speak_prompt && context.registry) {
      await speakText(prompt, context, finalApiKey);
    } else if (prompt && !speak_prompt) {
      (_b = context.logger) == null ? void 0 : _b.info(`\u{1F4DD} ${prompt}`);
    }
    const audioBuffer = auto_detect_silence ? await recordAudioWithSilenceDetection(
      duration,
      min_duration,
      silence_threshold,
      silence_duration,
      context
    ) : await recordAudioFixed(duration, context);
    const transcription = await transcribeAudio(
      audioBuffer,
      finalApiKey,
      language,
      context
    );
    return {
      success: true,
      output: transcription,
      data: {
        transcription,
        language,
        voiceModeEnabled,
        autoDetectedSilence: auto_detect_silence
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}).build();
export {
  index_default as default
};
