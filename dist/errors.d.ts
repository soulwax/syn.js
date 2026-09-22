export type AudioMetadataErrorCode = "empty_input" | "file_too_large" | "unsupported_format" | "hint_mismatch" | "malformed_audio" | "aborted" | "parser_failure";
export declare class AudioMetadataError extends Error {
    readonly code: AudioMetadataErrorCode;
    constructor(code: AudioMetadataErrorCode, message: string, options?: ErrorOptions);
}
//# sourceMappingURL=errors.d.ts.map