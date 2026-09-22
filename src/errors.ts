export type AudioMetadataErrorCode =
  | "empty_input"
  | "file_too_large"
  | "unsupported_format"
  | "hint_mismatch"
  | "malformed_audio"
  | "aborted"
  | "parser_failure";

export class AudioMetadataError extends Error {
  readonly code: AudioMetadataErrorCode;

  constructor(
    code: AudioMetadataErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AudioMetadataError";
    this.code = code;
  }
}
