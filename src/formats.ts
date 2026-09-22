export type AudioFormatId =
  | "mp3"
  | "flac"
  | "aac"
  | "m4a"
  | "ogg"
  | "wav"
  | "webm";

export interface AudioFormat {
  readonly id: AudioFormatId;
  readonly label: string;
  readonly contentType: string;
  readonly extensions: readonly string[];
  readonly mimeTypes: readonly string[];
}

export const AUDIO_FORMATS: readonly AudioFormat[] = Object.freeze([
  {
    id: "mp3",
    label: "MP3",
    contentType: "audio/mpeg",
    extensions: Object.freeze(["mp3"]),
    mimeTypes: Object.freeze(["audio/mpeg", "audio/mp3", "audio/x-mpeg"]),
  },
  {
    id: "flac",
    label: "FLAC",
    contentType: "audio/flac",
    extensions: Object.freeze(["flac"]),
    mimeTypes: Object.freeze(["audio/flac", "audio/x-flac"]),
  },
  {
    id: "aac",
    label: "AAC",
    contentType: "audio/aac",
    extensions: Object.freeze(["aac"]),
    mimeTypes: Object.freeze(["audio/aac", "audio/x-aac"]),
  },
  {
    id: "m4a",
    label: "M4A",
    contentType: "audio/mp4",
    extensions: Object.freeze(["m4a", "mp4"]),
    mimeTypes: Object.freeze(["audio/mp4", "audio/x-m4a"]),
  },
  {
    id: "ogg",
    label: "Ogg",
    contentType: "audio/ogg",
    extensions: Object.freeze(["ogg", "oga"]),
    mimeTypes: Object.freeze(["audio/ogg", "application/ogg"]),
  },
  {
    id: "wav",
    label: "WAV",
    contentType: "audio/wav",
    extensions: Object.freeze(["wav"]),
    mimeTypes: Object.freeze(["audio/wav", "audio/wave", "audio/x-wav"]),
  },
  {
    id: "webm",
    label: "WebM",
    contentType: "audio/webm",
    extensions: Object.freeze(["webm"]),
    mimeTypes: Object.freeze(["audio/webm"]),
  },
]);

export const AUDIO_ACCEPT = AUDIO_FORMATS.flatMap((format) => [
  ...format.mimeTypes,
  ...format.extensions.map((extension) => `.${extension}`),
]).join(",");

function format(id: AudioFormatId): AudioFormat {
  const match = AUDIO_FORMATS.find((candidate) => candidate.id === id);
  if (!match) throw new Error(`Missing audio format registry entry: ${id}`);
  return match;
}

function startsWith(
  bytes: Uint8Array,
  signature: ArrayLike<number>,
  offset = 0,
): boolean {
  for (let index = 0; index < signature.length; index += 1) {
    if (bytes[offset + index] !== signature[index]) return false;
  }
  return true;
}

function includesAscii(
  bytes: Uint8Array,
  value: string,
  limit = 4096,
): boolean {
  const encoded = new TextEncoder().encode(value);
  const end = Math.min(bytes.length - encoded.length + 1, limit);
  for (let offset = 0; offset < end; offset += 1) {
    if (startsWith(bytes, encoded, offset)) return true;
  }
  return false;
}

export function detectAudioFormat(bytes: Uint8Array): AudioFormat | null {
  if (startsWith(bytes, [0x66, 0x4c, 0x61, 0x43])) return format("flac"); // fLaC
  if (startsWith(bytes, [0x4f, 0x67, 0x67, 0x53])) return format("ogg"); // OggS

  const isWave =
    (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) ||
      startsWith(bytes, [0x52, 0x46, 0x36, 0x34]) ||
      startsWith(bytes, [0x42, 0x57, 0x36, 0x34])) &&
    startsWith(bytes, [0x57, 0x41, 0x56, 0x45], 8);
  if (isWave) return format("wav");

  if (startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4)) return format("m4a"); // ISO BMFF

  const isWebm =
    startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3]) && includesAscii(bytes, "webm");
  if (isWebm) return format("webm");

  if (startsWith(bytes, [0x49, 0x44, 0x33])) return format("mp3"); // ID3

  if (bytes.length >= 2 && bytes[0] === 0xff) {
    const second = bytes[1] ?? 0;
    const isAdts = (second & 0xf6) === 0xf0;
    if (isAdts) return format("aac");

    const version = (second >> 3) & 0b11;
    const layer = (second >> 1) & 0b11;
    const isMpegAudio =
      (second & 0xe0) === 0xe0 && version !== 0b01 && layer !== 0b00;
    if (isMpegAudio) return format("mp3");
  }

  return null;
}

export function findAudioFormatByExtension(
  fileName: string,
): AudioFormat | null {
  const extension = fileName.trim().split(".").at(-1)?.toLowerCase();
  if (!extension || extension === fileName.trim().toLowerCase()) return null;
  return (
    AUDIO_FORMATS.find((candidate) =>
      candidate.extensions.includes(extension),
    ) ?? null
  );
}

export function findAudioFormatByMimeType(
  mimeType: string,
): AudioFormat | null {
  const normalized = mimeType.trim().toLowerCase().split(";", 1)[0];
  if (!normalized) return null;
  return (
    AUDIO_FORMATS.find((candidate) =>
      candidate.mimeTypes.includes(normalized),
    ) ?? null
  );
}
