import { describe, expect, it } from "vitest";
import { AUDIO_FORMATS } from "../src/formats.js";
import { normalizeMetadata, type ParserMetadata } from "../src/metadata.js";

const mp3 = AUDIO_FORMATS.find((format) => format.id === "mp3");
if (!mp3) throw new Error("The MP3 registry entry is required for this test.");

describe("metadata normalization", () => {
  it("normalizes text, arrays, numbers, and technical properties", () => {
    const metadata: ParserMetadata = {
      format: {
        container: "MPEG",
        codec: "MPEG 1 Layer 3",
        duration: 123.4,
        bitrate: 320000,
        sampleRate: 44100,
        numberOfChannels: 2,
        bitsPerSample: 16,
        lossless: false,
      },
      common: {
        title: "  A\u0000 Song  ",
        artist: "One",
        artists: ["One", "Two"],
        album: "Record",
        albumartist: "Various",
        track: { no: 2, of: 10 },
        disk: { no: 1, of: 2 },
        date: "2026-09-22",
        year: 2026,
        genre: ["Electronic", "Electronic"],
        composer: ["Composer"],
        isrc: ["DEABC2600001"],
      },
    };

    expect(
      normalizeMetadata(mp3, metadata, {
        includeArtwork: false,
        maxArtworkBytes: 1024,
        maxArtworkCount: 1,
      }),
    ).toMatchObject({
      format: {
        id: "mp3",
        contentType: "audio/mpeg",
        durationSeconds: 123.4,
        sampleRate: 44100,
        lossless: false,
      },
      tags: {
        title: "A Song",
        artists: ["One", "Two"],
        albumArtists: ["Various"],
        track: { number: 2, total: 10 },
        genres: ["Electronic"],
      },
    });
  });

  it("omits artwork by default and applies aggregate limits when requested", () => {
    const metadata: ParserMetadata = {
      format: {},
      common: {
        picture: [
          { format: "image/jpeg", data: Uint8Array.from([1, 2]) },
          { format: "image/png", data: Uint8Array.from([3, 4]) },
        ],
      },
    };
    const omitted = normalizeMetadata(
      mp3,
      metadata,
      { includeArtwork: false, maxArtworkBytes: 3, maxArtworkCount: 2 },
      [],
    );
    const bounded = normalizeMetadata(mp3, metadata, {
      includeArtwork: true,
      maxArtworkBytes: 3,
      maxArtworkCount: 2,
    });

    expect(omitted.artwork).toEqual([]);
    expect(omitted.warnings).toContainEqual(
      expect.objectContaining({ code: "artwork_omitted" }),
    );
    expect(bounded.artwork).toHaveLength(1);
    expect(bounded.warnings).toContainEqual(
      expect.objectContaining({ code: "artwork_limit" }),
    );
  });
});
