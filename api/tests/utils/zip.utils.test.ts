import { inflateRawSync } from 'zlib';
import { crc32, createZip } from '../../src/utils/zip.utils';

/** Lee las entradas de un zip recorriendo el directorio central. */
function readZip(zip: Buffer): { name: string; data: Buffer }[] {
  const endOffset = zip.length - 22;
  expect(zip.readUInt32LE(endOffset)).toBe(0x06054b50);
  const count = zip.readUInt16LE(endOffset + 10);
  let cursor = zip.readUInt32LE(endOffset + 16);
  const entries: { name: string; data: Buffer }[] = [];
  for (let i = 0; i < count; i++) {
    expect(zip.readUInt32LE(cursor)).toBe(0x02014b50);
    const crc = zip.readUInt32LE(cursor + 16);
    const compressedSize = zip.readUInt32LE(cursor + 20);
    const nameLength = zip.readUInt16LE(cursor + 28);
    const localOffset = zip.readUInt32LE(cursor + 42);
    const name = zip.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');

    expect(zip.readUInt32LE(localOffset)).toBe(0x04034b50);
    const localNameLength = zip.readUInt16LE(localOffset + 26);
    const dataStart = localOffset + 30 + localNameLength;
    const data = inflateRawSync(zip.subarray(dataStart, dataStart + compressedSize));
    expect(crc32(data)).toBe(crc);

    entries.push({ name, data });
    cursor += 46 + nameLength;
  }
  return entries;
}

describe('zip.utils', () => {
  it('calcula el CRC32 estándar', () => {
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926);
  });

  it('arma un zip con varias entradas legibles', () => {
    const zip = createZip([
      { name: 'liquidacion-cajero1.pdf', data: Buffer.from('%PDF-1.4 uno') },
      { name: 'liquidación-ñandú.pdf', data: Buffer.from('%PDF-1.4 dos'.repeat(50)) }
    ]);

    expect(readZip(zip)).toEqual([
      { name: 'liquidacion-cajero1.pdf', data: Buffer.from('%PDF-1.4 uno') },
      { name: 'liquidación-ñandú.pdf', data: Buffer.from('%PDF-1.4 dos'.repeat(50)) }
    ]);
  });

  it('un zip vacío es solo el fin de directorio', () => {
    const zip = createZip([]);
    expect(zip.length).toBe(22);
    expect(readZip(zip)).toEqual([]);
  });
});
