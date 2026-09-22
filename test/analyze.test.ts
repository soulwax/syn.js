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

  it("accepts ArrayBuffer and Blob inputs", async () => {
    const wave = waveFixture();
    const buffer = wave.buffer.slice(
      wave.byteOffset,
      wave.byteOffset + wave.byteLength,
    ) as ArrayBuffer;
    const blob = new Blob([buffer], { type: "audio/wav" });

    await expect(analyzeAudio(buffer)).resolves.toMatchObject({
      format: { id: "wav" },
    });
    await expect(analyzeAudio(blob)).resolves.toMatchObject({
      format: { id: "wav" },
    });
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

  it("rejects unknown file extensions in strict mode but tolerates generic MIME metadata", async () => {
    await expect(
      analyzeAudio(
        waveFixture(),
        { fileName: "tone.txt", mimeType: "application/octet-stream" },
        { strictHints: true },
      ),
    ).rejects.toMatchObject({ code: "hint_mismatch" });

    await expect(
      analyzeAudio(
        waveFixture(),
        { fileName: "tone.wav", mimeType: "application/octet-stream" },
        { strictHints: true },
      ),
    ).resolves.toMatchObject({ format: { id: "wav" } });
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

  it("rejects malformed data after recognizing its container", async () => {
    const truncatedWave = waveFixture().slice(0, 12);

    await expect(analyzeAudio(truncatedWave)).rejects.toMatchObject({
      code: "malformed_audio",
    });
  });

  it("checks a declared size and validates configured limits", async () => {
    await expect(
      analyzeAudio(waveFixture(), { size: 1 }),
    ).rejects.toMatchObject({
      code: "hint_mismatch",
    });
    await expect(
      analyzeAudio(waveFixture(), undefined, { maxArtworkCount: 0 }),
    ).rejects.toBeInstanceOf(RangeError);
  });

  it("observes an already-aborted signal", async () => {
    const controller = new AbortController();
    controller.abort("stop");

    await expect(
      analyzeAudio(waveFixture(), undefined, { signal: controller.signal }),
    ).rejects.toBeInstanceOf(AudioMetadataError);
  });
});
