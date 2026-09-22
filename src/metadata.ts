import type { AudioFormat, AudioFormatId } from "./formats.js";

export interface AudioWarning {
  readonly code:
    | "mime_mismatch"
    | "extension_mismatch"
    | "artwork_omitted"
    | "artwork_limit"
    | "partial_metadata";
  readonly message: string;
}

export interface AudioArtwork {
  readonly contentType: string;
  readonly data: Uint8Array;
  readonly description?: string;
}

export interface NumberPair {
  readonly number?: number;
  readonly total?: number;
}

export interface AudioTags {
  readonly title?: string;
  readonly artists: readonly string[];
  readonly album?: string;
  readonly albumArtists: readonly string[];
  readonly track?: NumberPair;
  readonly disc?: NumberPair;
  readonly date?: string;
  readonly year?: number;
  readonly genres: readonly string[];
  readonly composers: readonly string[];
  readonly isrc?: string;
  readonly copyright?: string;
}

export interface AudioTechnicalMetadata {
  readonly id: AudioFormatId;
  readonly contentType: string;
  readonly container?: string;
  readonly codec?: string;
  readonly durationSeconds?: number;
  readonly bitrate?: number;
  readonly sampleRate?: number;
  readonly channels?: number;
  readonly bitsPerSample?: number;
  readonly lossless?: boolean;
}

export interface AudioAnalysis {
  readonly format: AudioTechnicalMetadata;
  readonly tags: AudioTags;
  readonly artwork: readonly AudioArtwork[];
  readonly warnings: readonly AudioWarning[];
}

export interface ParserPicture {
  readonly format: string;
  readonly data: Uint8Array;
  readonly description?: string;
}

export interface ParserMetadata {
  readonly format: {
    readonly container?: string;
    readonly codec?: string;
    readonly duration?: number;
    readonly bitrate?: number;
    readonly sampleRate?: number;
    readonly numberOfChannels?: number;
    readonly bitsPerSample?: number;
    readonly lossless?: boolean;
  };
  readonly common: {
    readonly title?: string;
    readonly artist?: string;
    readonly artists?: readonly string[];
    readonly album?: string;
    readonly albumartist?: string;
    readonly track?: {
      readonly no?: number | null;
      readonly of?: number | null;
    };
    readonly disk?: {
      readonly no?: number | null;
      readonly of?: number | null;
    };
    readonly date?: string;
    readonly year?: number;
    readonly genre?: readonly string[];
    readonly composer?: readonly string[];
    readonly isrc?: readonly string[];
    readonly copyright?: string;
    readonly picture?: readonly ParserPicture[];
  };
}

export interface NormalizeOptions {
  readonly includeArtwork: boolean;
  readonly maxArtworkBytes: number;
  readonly maxArtworkCount: number;
}

function text(value: unknown, maxLength = 512): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value
    .replace(/\p{Cc}/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return normalized
    ? Array.from(normalized).slice(0, maxLength).join("")
    : undefined;
}

function strings(values: readonly unknown[]): readonly string[] {
  const result: string[] = [];
  for (const value of values) {
    const normalized = text(value);
    if (normalized && !result.includes(normalized)) result.push(normalized);
    if (result.length === 64) break;
  }
  return result;
}

function finite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function integer(value: unknown): number | undefined {
  const number = finite(value);
  return number === undefined ? undefined : Math.floor(number);
}

function pair(
  value:
    | { readonly no?: number | null; readonly of?: number | null }
    | undefined,
): NumberPair | undefined {
  const number = integer(value?.no);
  const total = integer(value?.of);
  return number === undefined && total === undefined
    ? undefined
    : {
        ...(number !== undefined ? { number } : {}),
        ...(total !== undefined ? { total } : {}),
      };
}

function normalizeArtwork(
  pictures: readonly ParserPicture[],
  options: NormalizeOptions,
  warnings: AudioWarning[],
): readonly AudioArtwork[] {
  if (!options.includeArtwork) {
    if (pictures.length > 0) {
      warnings.push({
        code: "artwork_omitted",
        message: "Embedded artwork was omitted.",
      });
    }
    return [];
  }

  const artwork: AudioArtwork[] = [];
  let totalBytes = 0;
  for (const picture of pictures) {
    if (
      artwork.length >= options.maxArtworkCount ||
      picture.data.byteLength > options.maxArtworkBytes ||
      totalBytes + picture.data.byteLength > options.maxArtworkBytes
    ) {
      warnings.push({
        code: "artwork_limit",
        message: "Embedded artwork exceeded configured limits.",
      });
      break;
    }
    const contentType = text(picture.format, 128);
    if (!contentType) continue;
    const description = text(picture.description, 256);
    artwork.push({
      contentType,
      data: new Uint8Array(picture.data),
      ...(description ? { description } : {}),
    });
    totalBytes += picture.data.byteLength;
  }
  return artwork;
}

export function normalizeMetadata(
  detected: AudioFormat,
  metadata: ParserMetadata,
  options: NormalizeOptions,
  initialWarnings: readonly AudioWarning[] = [],
): AudioAnalysis {
  const warnings = [...initialWarnings];
  const artists = strings([
    ...(metadata.common.artists ?? []),
    metadata.common.artist,
  ]);
  const albumArtists = strings([metadata.common.albumartist]);
  const genres = strings(metadata.common.genre ?? []);
  const composers = strings(metadata.common.composer ?? []);
  const artwork = normalizeArtwork(
    metadata.common.picture ?? [],
    options,
    warnings,
  );
  const title = text(metadata.common.title);
  const album = text(metadata.common.album);
  const track = pair(metadata.common.track);
  const disc = pair(metadata.common.disk);
  const date = text(metadata.common.date, 64);
  const year = integer(metadata.common.year);
  const isrc = text(metadata.common.isrc?.[0], 64);
  const copyright = text(metadata.common.copyright, 512);
  const container = text(metadata.format.container, 128);
  const codec = text(metadata.format.codec, 128);
  const durationSeconds = finite(metadata.format.duration);
  const bitrate = finite(metadata.format.bitrate);
  const sampleRate = finite(metadata.format.sampleRate);
  const channels = integer(metadata.format.numberOfChannels);
  const bitsPerSample = integer(metadata.format.bitsPerSample);

  return {
    format: {
      id: detected.id,
      contentType: detected.contentType,
      ...(container ? { container } : {}),
      ...(codec ? { codec } : {}),
      ...(durationSeconds !== undefined ? { durationSeconds } : {}),
      ...(bitrate !== undefined ? { bitrate } : {}),
      ...(sampleRate !== undefined ? { sampleRate } : {}),
      ...(channels !== undefined ? { channels } : {}),
      ...(bitsPerSample !== undefined ? { bitsPerSample } : {}),
      ...(typeof metadata.format.lossless === "boolean"
        ? { lossless: metadata.format.lossless }
        : {}),
    },
    tags: {
      ...(title ? { title } : {}),
      artists,
      ...(album ? { album } : {}),
      albumArtists,
      ...(track ? { track } : {}),
      ...(disc ? { disc } : {}),
      ...(date ? { date } : {}),
      ...(year !== undefined ? { year } : {}),
      genres,
      composers,
      ...(isrc ? { isrc } : {}),
      ...(copyright ? { copyright } : {}),
    },
    artwork,
    warnings,
  };
}
