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
default to a 128 MiB limit.

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
