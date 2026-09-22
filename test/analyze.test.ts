import { describe, expect, it } from "vitest";
import {
  analyzeAudio,
  analyzeWebStream,
  AudioMetadataError,
} from "../src/index.js";
import { waveFixture } from "./fixtures.js";

function webStream(chunks: readonly Uint8Array[]): ReadableStream<Uint8Array> {
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      const chunk = chunks[index++];
      if (chunk) controller.enqueue(chunk);
      else controller.close();
    },
  });
}

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

  it("parses a Web stream after replaying a split detection header", async () => {
    const wave = waveFixture();
    const result = await analyzeWebStream(
      webStream([wave.slice(0, 2), wave.slice(2, 17), wave.slice(17)]),
      { fileName: "tone.wav", mimeType: "audio/wav", size: wave.byteLength },
    );

    expect(result).toMatchObject({
      format: { id: "wav", sampleRate: 8000, channels: 1 },
      warnings: [],
    });
  });

  it("requires a bounded, trustworthy stream size before reading", async () => {
    const source = new ReadableStream<Uint8Array>();

    await expect(
      analyzeWebStream(source, { size: 129 * 1024 * 1024 }),
    ).rejects.toMatchObject({ code: "file_too_large" });
    expect(source.locked).toBe(false);
  });

  it("rejects a stream that exceeds its declared size", async () => {
    const wave = waveFixture();

    await expect(
      analyzeWebStream(webStream([wave]), { size: 1 }),
    ).rejects.toMatchObject({ code: "hint_mismatch" });
  });
});
