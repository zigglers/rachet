// ../tool-repo/src/index.ts
import { createTool, ToolCategory, ToolCapability } from "@ziggler/clanker";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
var execAsync = promisify(exec);
var ANIMATION_TEMPLATES = {
  "equation": `
from manim import *

class EquationAnimation(Scene):
    def construct(self):
        # Create equation
        equation = MathTex("{{EQUATION}}")
        equation.scale(1.5)
        
        # Animate
        self.play(Write(equation))
        self.wait(2)
    `,
  "graph": `
from manim import *

class GraphAnimation(Scene):
    def construct(self):
        # Create axes
        axes = Axes(
            x_range=[-5, 5, 1],
            y_range=[-5, 5, 1],
            x_length=10,
            y_length=6,
            axis_config={"color": BLUE},
        )
        
        # Create graph
        graph = axes.plot(lambda x: {{FUNCTION}}, color=GREEN)
        
        # Labels
        graph_label = axes.get_graph_label(graph, label='{{LABEL}}')
        
        # Animate
        self.play(Create(axes), run_time=2)
        self.play(Create(graph), run_time=2)
        self.play(Write(graph_label), run_time=1)
        self.wait(2)
    `,
  "transformation": `
from manim import *

class TransformationAnimation(Scene):
    def construct(self):
        # Create objects
        start = {{START_OBJECT}}
        end = {{END_OBJECT}}
        
        # Position
        start.move_to(LEFT * 3)
        end.move_to(RIGHT * 3)
        
        # Show transformation
        self.play(Create(start))
        self.wait(1)
        self.play(Transform(start, end), run_time=2)
        self.wait(2)
    `,
  "text_sequence": `
from manim import *

class TextSequenceAnimation(Scene):
    def construct(self):
        texts = {{TEXTS}}
        
        for i, text_content in enumerate(texts):
            text = Text(text_content, font_size=48)
            if i > 0:
                self.play(FadeOut(prev_text))
            self.play(Write(text))
            self.wait(2)
            prev_text = text
        
        self.play(FadeOut(prev_text))
    `,
  "custom": `
from manim import *

class CustomAnimation(Scene):
    def construct(self):
{{CUSTOM_CODE}}
    `
};
var ANIMATION_PRESETS = [
  { name: "quadratic", template: "equation", params: { EQUATION: "x^2 + 2x + 1 = 0" } },
  { name: "sine_wave", template: "graph", params: { FUNCTION: "np.sin(x)", LABEL: "sin(x)" } },
  { name: "circle_to_square", template: "transformation", params: {
    START_OBJECT: "Circle(radius=1, color=BLUE)",
    END_OBJECT: "Square(side_length=2, color=RED)"
  } },
  { name: "introduction", template: "text_sequence", params: {
    TEXTS: '["Welcome to Manim", "Mathematical Animations", "Made Easy!"]'
  } }
];
var index_default = createTool().id("manim_animator").name("Manim Animator").description("Create beautiful mathematical animations using Manim. Generate videos from equations, graphs, transformations, and custom animations. Perfect for educational content with ElevenLabs narration.").category(ToolCategory.Development).capabilities(ToolCapability.SystemExecute, ToolCapability.FileWrite, ToolCapability.FileRead).tags("manim", "animation", "video", "math", "visualization", "education", "ffmpeg").stringArg("type", "Animation type: equation, graph, transformation, text_sequence, custom, or preset name", {
  required: true,
  enum: [
    "equation",
    "graph",
    "transformation",
    "text_sequence",
    "custom",
    ...ANIMATION_PRESETS.map((p) => p.name)
  ]
}).stringArg("content", "Content for the animation (equation, function, custom code, etc.)", {
  required: false
}).stringArg("output_path", "Output video file path (defaults to temp directory)", {
  required: false
}).stringArg("quality", "Video quality", {
  required: false,
  default: "medium",
  enum: ["low", "medium", "high", "4k"]
}).numberArg("fps", "Frames per second", {
  required: false,
  default: 30
}).booleanArg("preview", "Open preview after rendering", {
  required: false,
  default: false
}).stringArg("background_color", "Background color (hex or Manim color)", {
  required: false,
  default: "#000000"
}).onInitialize(async (context) => {
  var _a, _b, _c, _d, _e;
  (_a = context.logger) == null ? void 0 : _a.info("Manim Animator initializing...");
  try {
    await execAsync("manim --version");
    (_b = context.logger) == null ? void 0 : _b.info("Manim is installed");
  } catch (error) {
    (_c = context.logger) == null ? void 0 : _c.warn("Manim not found. Install with: pip install manim");
  }
  try {
    await execAsync("ffmpeg -version");
    (_d = context.logger) == null ? void 0 : _d.info("FFmpeg is installed");
  } catch (error) {
    (_e = context.logger) == null ? void 0 : _e.warn("FFmpeg not found. Required for video processing");
  }
}).execute(async (args, context) => {
  var _a;
  const { type, content, output_path, quality, fps, preview, background_color } = args;
  try {
    const preset = ANIMATION_PRESETS.find((p) => p.name === type);
    let template;
    let params = {};
    if (preset) {
      template = ANIMATION_TEMPLATES[preset.template] || "";
      params = preset.params;
    } else {
      const animationType = type;
      template = ANIMATION_TEMPLATES[animationType] || "";
      if (!template) {
        return {
          success: false,
          error: `Unknown animation type: ${type}`
        };
      }
      params = parseContentForType(animationType, content || "");
    }
    const videoPath = await generateAnimation(
      template,
      params,
      {
        outputPath: output_path,
        quality,
        fps,
        preview,
        backgroundColor: background_color
      },
      context
    );
    return {
      success: true,
      output: `Animation created successfully!`,
      data: {
        videoPath,
        type,
        quality,
        fps,
        duration: await getVideoDuration(videoPath)
      }
    };
  } catch (error) {
    (_a = context.logger) == null ? void 0 : _a.error("Animation generation failed:", error);
    return {
      success: false,
      error: `Failed to generate animation: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}).examples([
  {
    description: "Create a simple equation animation",
    arguments: {
      type: "equation",
      content: "E = mc^2"
    },
    result: "Animation created at /tmp/manim_output_xxx.mp4"
  },
  {
    description: "Create a graph animation",
    arguments: {
      type: "graph",
      content: "x**2,Parabola"
    },
    result: "Graph animation created"
  },
  {
    description: "Use a preset animation",
    arguments: {
      type: "sine_wave"
    },
    result: "Sine wave animation created"
  },
  {
    description: "Create text sequence for intro",
    arguments: {
      type: "text_sequence",
      content: "Welcome,Learn Math,With Animations!"
    },
    result: "Text sequence animation created"
  },
  {
    description: "Custom Manim code",
    arguments: {
      type: "custom",
      content: `        # Draw a rotating cube
        cube = Cube()
        self.play(Create(cube))
        self.play(Rotate(cube, angle=2*PI, axis=UP), run_time=3)`,
      quality: "high"
    },
    result: "Custom animation created in high quality"
  }
]).build();
function parseContentForType(type, content) {
  switch (type) {
    case "equation":
      return { EQUATION: content || "x^2 + 2x + 1 = 0" };
    case "graph":
      const [func, label] = content.split(",").map((s) => s.trim());
      return {
        FUNCTION: func || "x**2",
        LABEL: label || "f(x)"
      };
    case "transformation":
      const [start, end] = content.split("|").map((s) => s.trim());
      return {
        START_OBJECT: start || "Circle(radius=1, color=BLUE)",
        END_OBJECT: end || "Square(side_length=2, color=RED)"
      };
    case "text_sequence":
      const texts = content.split(",").map((s) => s.trim());
      return {
        TEXTS: JSON.stringify(texts.length > 0 ? texts : ["Hello", "World"])
      };
    case "custom":
      const indentedCode = content.split("\n").map((line) => "        " + line).join("\n");
      return { CUSTOM_CODE: indentedCode };
    default:
      return {};
  }
}
async function generateAnimation(template, params, options, context) {
  var _a, _b, _c;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "manim-"));
  const scriptFile = path.join(tempDir, "animation.py");
  let scriptContent = template;
  for (const [key, value] of Object.entries(params)) {
    scriptContent = scriptContent.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  if (options.backgroundColor && options.backgroundColor !== "#000000") {
    scriptContent = scriptContent.replace(
      "class \\w+Animation\\(Scene\\):",
      `class Animation(Scene):
    def __init__(self):
        super().__init__()
        self.camera.background_color = "${options.backgroundColor}"`
    );
  }
  await fs.writeFile(scriptFile, scriptContent);
  (_a = context.logger) == null ? void 0 : _a.debug(`Script written to: ${scriptFile}`);
  const qualityMap = {
    "low": "-ql",
    "medium": "-qm",
    "high": "-qh",
    "4k": "-qk"
  };
  const qualityFlag = qualityMap[options.quality || "medium"];
  const outputDir = path.dirname(options.outputPath || tempDir);
  const outputName = path.basename(options.outputPath || `manim_output_${Date.now()}.mp4`, ".mp4");
  let command = `manim ${scriptFile} ${qualityFlag} --fps ${options.fps || 30}`;
  command += ` --media_dir "${outputDir}"`;
  command += ` -o "${outputName}.mp4"`;
  if (options.preview) {
    command += " --preview";
  }
  (_b = context.logger) == null ? void 0 : _b.info(`Executing: ${command}`);
  try {
    const { stderr } = await execAsync(command, {
      cwd: tempDir,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" }
    });
    if (stderr && !stderr.includes("INFO")) {
      (_c = context.logger) == null ? void 0 : _c.warn(`Manim stderr: ${stderr}`);
    }
    const mediaDir = path.join(outputDir, "media", "videos", "animation", "1080p30");
    const files = await fs.readdir(mediaDir).catch(() => []);
    const videoFile = files.find((f) => f.endsWith(".mp4"));
    if (!videoFile) {
      const altPath = path.join(tempDir, "media", "videos", "animation", "1080p30", `${outputName}.mp4`);
      if (await fs.access(altPath).then(() => true).catch(() => false)) {
        return altPath;
      }
      throw new Error("Output video not found");
    }
    const finalPath = path.join(mediaDir, videoFile);
    if (options.outputPath) {
      await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
      await fs.copyFile(finalPath, options.outputPath);
      return options.outputPath;
    }
    return finalPath;
  } finally {
    setTimeout(async () => {
      var _a2;
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        (_a2 = context.logger) == null ? void 0 : _a2.debug("Failed to cleanup temp directory:", error);
      }
    }, options.preview ? 3e4 : 5e3);
  }
}
async function getVideoDuration(videoPath) {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    );
    return parseFloat(stdout.trim());
  } catch {
    return 0;
  }
}
export {
  index_default as default
};
