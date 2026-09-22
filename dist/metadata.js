function text(value, maxLength = 512) {
    if (typeof value !== "string")
        return undefined;
    const normalized = value
        .replace(/\p{Cc}/gu, " ")
        .replace(/\s+/gu, " ")
        .trim();
    return normalized
        ? Array.from(normalized).slice(0, maxLength).join("")
        : undefined;
}
function strings(values) {
    const result = [];
    for (const value of values) {
        const normalized = text(value);
        if (normalized && !result.includes(normalized))
            result.push(normalized);
        if (result.length === 64)
            break;
    }
    return result;
}
function finite(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0
        ? value
        : undefined;
}
function integer(value) {
    const number = finite(value);
    return number === undefined ? undefined : Math.floor(number);
}
function pair(value) {
    const number = integer(value?.no);
    const total = integer(value?.of);
    return number === undefined && total === undefined
        ? undefined
        : {
            ...(number !== undefined ? { number } : {}),
            ...(total !== undefined ? { total } : {}),
        };
}
function normalizeArtwork(pictures, options, warnings) {
    if (!options.includeArtwork) {
        if (pictures.length > 0) {
            warnings.push({
                code: "artwork_omitted",
                message: "Embedded artwork was omitted.",
            });
        }
        return [];
    }
    const artwork = [];
    let totalBytes = 0;
    for (const picture of pictures) {
        if (artwork.length >= options.maxArtworkCount ||
            picture.data.byteLength > options.maxArtworkBytes ||
            totalBytes + picture.data.byteLength > options.maxArtworkBytes) {
            warnings.push({
                code: "artwork_limit",
                message: "Embedded artwork exceeded configured limits.",
            });
            break;
        }
        const contentType = text(picture.format, 128);
        if (!contentType)
            continue;
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
export function normalizeMetadata(detected, metadata, options, initialWarnings = []) {
    const warnings = [...initialWarnings];
    const artists = strings([
        ...(metadata.common.artists ?? []),
        metadata.common.artist,
    ]);
    const albumArtists = strings([metadata.common.albumartist]);
    const genres = strings(metadata.common.genre ?? []);
    const composers = strings(metadata.common.composer ?? []);
    const artwork = normalizeArtwork(metadata.common.picture ?? [], options, warnings);
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
//# sourceMappingURL=metadata.js.map