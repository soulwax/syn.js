import { type AudioAnalysis } from "./metadata.js";
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
export declare function analyzeAudio(input: AudioInput, hints?: AudioHints, options?: AnalyzeOptions): Promise<AudioAnalysis>;
//# sourceMappingURL=analyze.d.ts.map