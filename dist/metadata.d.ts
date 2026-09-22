import type { AudioFormat, AudioFormatId } from "./formats.js";
export interface AudioWarning {
    readonly code: "mime_mismatch" | "extension_mismatch" | "artwork_omitted" | "artwork_limit" | "partial_metadata";
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
export declare function normalizeMetadata(detected: AudioFormat, metadata: ParserMetadata, options: NormalizeOptions, initialWarnings?: readonly AudioWarning[]): AudioAnalysis;
//# sourceMappingURL=metadata.d.ts.map