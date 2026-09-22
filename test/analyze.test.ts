import { describe, expect, it } from "vitest";
import { analyzeAudio, AudioMetadataError } from "../src/index.js";
import { waveFixture } from "./fixtures.js";

describe("analyzeAudio", () => {
  it("parses a synthetic WAV and returns normalized technical metadata", async () => {
    const result = await analyzeAudio(waveFixture(), {
      fileName: "tone.wav",
      mimeType: "audio/wave",
    });

    expect(result).toMatchObject({
      format: {
        id: "wav",
        contentType: "audio/wav",
        sampleRate: 8000,
        channels: 1,
        bitsPerSample: 8,
        lossless: true,
      },
      tags: { artists: [], albumArtists: [], genres: [], composers: [] },
      artwork: [],
      warnings: [],
    });
    expect(result.format.durationSeconds).toBeCloseTo(0.001);
  });

  it("reports a renamed file and can reject it in strict mode", async () => {
    const result = await analyzeAudio(waveFixture(), {
      fileName: "tone.mp3",
      mimeType: "audio/mpeg",
    });
    await expect(
      analyzeAudio(
        waveFixture(),
        { fileName: "tone.mp3", mimeType: "audio/mpeg" },
        { strictHints: true },
      ),
    ).rejects.toMatchObject({ code: "hint_mismatch" });

    expect(result.warnings.map((warning) => warning.code)).toEqual([
      "mime_mismatch",
      "extension_mismatch",
    ]);
  });

  it.each([
    [new Uint8Array(), "empty_input"],
    [Uint8Array.from([1, 2, 3]), "unsupported_format"],
  ])("rejects invalid input with a stable error", async (input, code) => {
    await expect(analyzeAudio(input)).rejects.toMatchObject({
      name: "AudioMetadataError",
      code,
    });
  });

  it("enforces source size before parsing", async () => {
    await expect(
      analyzeAudio(waveFixture(), undefined, { maxFileBytes: 4 }),
    ).rejects.toMatchObject({
      code: "file_too_large",
    });
  });

  it("observes an already-aborted signal", async () => {
    const controller = new AbortController();
    controller.abort("stop");

    await expect(
      analyzeAudio(waveFixture(), undefined, { signal: controller.signal }),
    ).rejects.toBeInstanceOf(AudioMetadataError);
  });
});
