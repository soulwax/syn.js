import { describe, expect, it } from "vitest";
import {
  AUDIO_ACCEPT,
  AUDIO_FORMATS,
  detectAudioFormat,
  findAudioFormatByExtension,
  findAudioFormatByMimeType,
} from "../src/index.js";

describe("audio formats", () => {
  it.each([
    ["mp3", [0x49, 0x44, 0x33, 0x04]],
    ["mp3", [0xff, 0xfb, 0x90, 0x64]],
    ["flac", [0x66, 0x4c, 0x61, 0x43]],
    ["aac", [0xff, 0xf1, 0x50, 0x80]],
    ["m4a", [0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70]],
    ["ogg", [0x4f, 0x67, 0x67, 0x53]],
    ["wav", [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]],
    ["webm", [0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0x77, 0x65, 0x62, 0x6d]],
  ])("detects %s from bytes", (id, bytes) => {
    expect(detectAudioFormat(Uint8Array.from(bytes))?.id).toBe(id);
  });

  it("rejects generic EBML that does not declare WebM", () => {
    expect(
      detectAudioFormat(Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3])),
    ).toBeNull();
  });

  it("maps aliases without trusting parameters or case", () => {
    expect(findAudioFormatByMimeType(" Audio/X-M4A; codecs=aac ")?.id).toBe(
      "m4a",
    );
    expect(findAudioFormatByExtension("My.Mix.FLAC")?.id).toBe("flac");
  });

  it("publishes one accept contract for all formats", () => {
    expect(AUDIO_FORMATS).toHaveLength(7);
    expect(AUDIO_ACCEPT).toContain("audio/mpeg");
    expect(AUDIO_ACCEPT).toContain(".webm");
  });
});
