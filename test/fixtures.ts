function ascii(value: string): number[] {
  return Array.from(new TextEncoder().encode(value));
}

function littleEndian(value: number, bytes: number): number[] {
  return Array.from(
    { length: bytes },
    (_, index) => (value >> (index * 8)) & 0xff,
  );
}

export function waveFixture(): Uint8Array {
  const samples = [128, 144, 160, 144, 128, 112, 96, 112];
  const dataSize = samples.length;
  const riffSize = 36 + dataSize;
  return Uint8Array.from([
    ...ascii("RIFF"),
    ...littleEndian(riffSize, 4),
    ...ascii("WAVE"),
    ...ascii("fmt "),
    ...littleEndian(16, 4),
    ...littleEndian(1, 2),
    ...littleEndian(1, 2),
    ...littleEndian(8000, 4),
    ...littleEndian(8000, 4),
    ...littleEndian(1, 2),
    ...littleEndian(8, 2),
    ...ascii("data"),
    ...littleEndian(dataSize, 4),
    ...samples,
  ]);
}
