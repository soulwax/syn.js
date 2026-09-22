# syn.js

Bounded audio format detection and normalized music metadata for server-side JavaScript.

`syn.js` identifies the real container from bytes and reads embedded metadata without coupling your
application to parser-specific objects. It supports MP3, FLAC, raw AAC/ADTS, M4A/MP4, Ogg, WAV,
and WebM. It does not decode, play, transcode, upload, store, or fetch audio.

> **Status:** `0.1.0` is an initial API. The package has not been published to npm yet.

## Install

```sh
pnpm add syn.js
```

Node 20 or newer and ESM are required.

## Analyze a file

```ts
import { analyzeAudio } from "syn.js";

const bytes = new Uint8Array(await file.arrayBuffer());
const analysis = await analyzeAudio(
  bytes,
  { fileName: file.name, mimeType: file.type, size: file.size },
  {
    maxFileBytes: 128 * 1024 * 1024,
    strictHints: true,
    includeArtwork: false,
  },
);

console.log(analysis.format.codec, analysis.tags.title, analysis.tags.artists);
```

Byte detection is authoritative. Filename and MIME values are untrusted hints: mismatches become
warnings by default or `AudioMetadataError` with code `hint_mismatch` in strict mode.

## Analyze a Web stream

```ts
import { analyzeWebStream } from "syn.js";

const analysis = await analyzeWebStream(upload.body, {
  fileName: upload.name,
  mimeType: upload.contentType,
  size: upload.contentLength,
});
```

`analyzeWebStream` reads until it has a 4 KiB detection prefix, then replays every pulled chunk to
the parser without concatenating the source into a second file-sized buffer. `size` is mandatory:
obtain it from trusted object-storage metadata or a validated `Content-Length`; it is the admission
limit used to reject oversized streams before they are read. This API accepts Web
`ReadableStream<Uint8Array>` values, including the streams exposed by modern server runtimes. It
does not accept arbitrary Node streams.

## Detect without parsing

```ts
import { AUDIO_ACCEPT, AUDIO_FORMATS, detectAudioFormat } from "syn.js";

const detected = detectAudioFormat(bytes);
console.log(detected?.contentType);
```

`AUDIO_ACCEPT` is suitable for a browser file input. It improves file selection but is never a
security boundary.

## Artwork and limits

Embedded artwork is disabled by default. Opt in with `includeArtwork`, `maxArtworkBytes`, and
`maxArtworkCount`. `maxArtworkBytes` is both the per-image and aggregate ceiling. Source files
default to a 128 MiB limit. Stream callers must pass a trusted size and the stream is stopped if it
emits more bytes than declared.

The parser runs in-process. `AbortSignal` is checked before reading and before returning, but it is
not a hard CPU timeout. Use a worker/process boundary if your threat model requires forced
termination.

## Supported versus playable

Support means that `syn.js` can identify the container and ask `music-metadata` to parse it. It does
not guarantee that Node, a browser, FFmpeg, or a particular device can decode the contained codec.
Always use `analysis.format.container` and `analysis.format.codec` for a separate playback or
processing decision.

## Development

```sh
pnpm install
pnpm check
```

Tests use tiny generated buffers. Do not add copyrighted recordings, private uploads, credentials,
or provider payloads as fixtures.

## License

MIT
