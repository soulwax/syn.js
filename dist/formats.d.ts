export type AudioFormatId = "mp3" | "flac" | "aac" | "m4a" | "ogg" | "wav" | "webm";
export interface AudioFormat {
    readonly id: AudioFormatId;
    readonly label: string;
    readonly contentType: string;
    readonly extensions: readonly string[];
    readonly mimeTypes: readonly string[];
}
export declare const AUDIO_FORMATS: readonly AudioFormat[];
export declare const AUDIO_ACCEPT: string;
export declare function detectAudioFormat(bytes: Uint8Array): AudioFormat | null;
export declare function findAudioFormatByExtension(fileName: string): AudioFormat | null;
export declare function findAudioFormatByMimeType(mimeType: string): AudioFormat | null;
//# sourceMappingURL=formats.d.ts.map