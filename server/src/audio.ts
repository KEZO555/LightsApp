import { spawn, spawnSync } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { randomBytes } from "crypto";
import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";

let ffmpegAvailable: boolean | null = null;

/** Detect ffmpeg once and cache the result. */
export function hasFfmpeg(): boolean {
  if (ffmpegAvailable === null) {
    try {
      const res = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
      ffmpegAvailable = res.status === 0;
    } catch {
      ffmpegAvailable = false;
    }
    if (!ffmpegAvailable) {
      console.warn("[Audio] ffmpeg not found — voice notes will be sent without Opus transcoding.");
    }
  }
  return ffmpegAvailable;
}

/**
 * Transcode an arbitrary audio buffer (e.g. m4a recorded on-device) into
 * Ogg/Opus, which WhatsApp expects for proper voice-note playback. Returns
 * null if ffmpeg is unavailable or the conversion fails, so callers can fall
 * back to sending the original bytes.
 */
export function transcodeToOpus(input: Buffer): Promise<Buffer | null> {
  if (!hasFfmpeg()) return Promise.resolve(null);

  const id = randomBytes(8).toString("hex");
  const inPath = join(tmpdir(), `la_${id}.in`);
  const outPath = join(tmpdir(), `la_${id}.ogg`);

  return new Promise((resolve) => {
    const cleanup = () => {
      for (const p of [inPath, outPath]) {
        try {
          if (existsSync(p)) unlinkSync(p);
        } catch {
          /* ignore */
        }
      }
    };

    try {
      writeFileSync(inPath, input);
    } catch {
      cleanup();
      resolve(null);
      return;
    }

    const ff = spawn("ffmpeg", [
      "-y",
      "-i", inPath,
      "-c:a", "libopus",
      "-b:a", "24k",
      "-ar", "48000",
      "-ac", "1",
      "-f", "ogg",
      outPath,
    ]);

    ff.on("error", () => {
      cleanup();
      resolve(null);
    });

    ff.on("close", (code) => {
      if (code === 0 && existsSync(outPath)) {
        try {
          const out = readFileSync(outPath);
          cleanup();
          resolve(out.length > 0 ? out : null);
          return;
        } catch {
          /* fall through */
        }
      }
      cleanup();
      resolve(null);
    });
  });
}
