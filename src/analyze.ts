import { parseBuffer } from "music-metadata";
import { AudioMetadataError } from "./errors.js";
import {
  detectAudioFormat,
  findAudioFormatByExtension,
  findAudioFormatByMimeType,
} from "./formats.js";
import {
  normalizeMetadata,
  type AudioAnalysis,
  type AudioWarning,
} from "./metadata.js";

export type AudioInput = Uint8Array | ArrayBuffer | Blob;

export interface AudioHints {
  readonly fileName?: string;
  readonly mimeType?: string;
  readonly size?: number;
}

export interface AnalyzeOptions {
  readonly maxFileBytes?: number;
  readonly strictHints?: boolean;
  readonly includeArtwork?: boolean;
  readonly maxArtworkBytes?: number;
  readonly maxArtworkCount?: number;
  readonly duration?: boolean;
  readonly signal?: AbortSignal;
}

const DEFAULT_MAX_FILE_BYTES = 128 * 1024 * 1024;
const DEFAULT_MAX_ARTWORK_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_ARTWORK_COUNT = 4;

function positiveLimit(
  value: number | undefined,
  fallback: number,
  name: string,
): number {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved <= 0) {
    throw new RangeError(`${name} must be a positive safe integer.`);
  }
  return resolved;
}

function abortIfNeeded(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new AudioMetadataError("aborted", "Audio analysis was aborted.", {
      cause: signal.reason,
    });
  }
}

async function bytesFrom(
  input: AudioInput,
  maxFileBytes: number,
): Promise<Uint8Array> {
  const knownSize = input instanceof Blob ? input.size : input.byteLength;
  if (knownSize === 0)
    throw new AudioMetadataError("empty_input", "Audio input is empty.");
  if (knownSize > maxFileBytes) {
    throw new AudioMetadataError(
      "file_too_large",
      "Audio input exceeds the configured size limit.",
    );
  }
  if (input instanceof Blob) return new Uint8Array(await input.arrayBuffer());
  if (input instanceof Uint8Array) return input;
  return new Uint8Array(input);
}

function hintWarnings(
  detectedId: string,
  hints: AudioHints | undefined,
): readonly AudioWarning[] {
  const warnings: AudioWarning[] = [];
  const mimeFormat = hints?.mimeType
    ? findAudioFormatByMimeType(hints.mimeType)
    : null;
  if (mimeFormat && mimeFormat.id !== detectedId) {
    warnings.push({
      code: "mime_mismatch",
      message:
        "The declared MIME type does not match the detected audio format.",
    });
  }
  const extensionFormat = hints?.fileName
    ? findAudioFormatByExtension(hints.fileName)
    : null;
  if (extensionFormat && extensionFormat.id !== detectedId) {
    warnings.push({
      code: "extension_mismatch",
      message:
        "The filename extension does not match the detected audio format.",
    });
  }
  return warnings;
}

export async function analyzeAudio(
  input: AudioInput,
  hints?: AudioHints,
  options: AnalyzeOptions = {},
): Promise<AudioAnalysis> {
  const maxFileBytes = positiveLimit(
    options.maxFileBytes,
    DEFAULT_MAX_FILE_BYTES,
    "maxFileBytes",
  );
  const maxArtworkBytes = positiveLimit(
    options.maxArtworkBytes,
    DEFAULT_MAX_ARTWORK_BYTES,
    "maxArtworkBytes",
  );
  const maxArtworkCount = positiveLimit(
    options.maxArtworkCount,
    DEFAULT_MAX_ARTWORK_COUNT,
    "maxArtworkCount",
  );
  abortIfNeeded(options.signal);
  const bytes = await bytesFrom(input, maxFileBytes);
  abortIfNeeded(options.signal);

  if (hints?.size !== undefined && hints.size !== bytes.byteLength) {
    throw new AudioMetadataError(
      "hint_mismatch",
      "The declared size does not match the audio input.",
    );
  }

  const detected = detectAudioFormat(bytes);
  if (!detected) {
    throw new AudioMetadataError(
      "unsupported_format",
      "The audio format is not supported.",
    );
  }

  const warnings = hintWarnings(detected.id, hints);
  if (options.strictHints && warnings.length > 0) {
    throw new AudioMetadataError(
      "hint_mismatch",
      "Declared audio hints do not match the detected format.",
    );
  }

  try {
    const parsed = await parseBuffer(
      bytes,
      {
        mimeType: detected.contentType,
        size: bytes.byteLength,
        ...(hints?.fileName ? { path: hints.fileName } : {}),
      },
      {
        duration: options.duration ?? true,
        skipCovers: !(options.includeArtwork ?? false),
      },
    );
    abortIfNeeded(options.signal);
    return normalizeMetadata(
      detected,
      parsed,
      {
        includeArtwork: options.includeArtwork ?? false,
        maxArtworkBytes,
        maxArtworkCount,
      },
      warnings,
    );
  } catch (cause) {
    if (cause instanceof AudioMetadataError) throw cause;
    if (cause instanceof Error) {
      throw new AudioMetadataError(
        "malformed_audio",
        "The audio file could not be parsed.",
        {
          cause,
        },
      );
    }
    throw new AudioMetadataError(
      "parser_failure",
      "The metadata parser failed unexpectedly.",
    );
  }
}
