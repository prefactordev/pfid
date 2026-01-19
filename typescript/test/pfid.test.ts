import { describe, test, expect } from 'vitest';
import {
  zero,
  generate,
  generateWithTimestamp,
  generateExample,
  generateRelated,
  generateRoot,
  generateBinary,
  generateBinaryWithTimestamp,
  isPfid,
  encode,
  decode,
  extractPartition,
  generatePartition,
  PfidError,
} from '../src';

describe('zero', () => {
  test('returns a zero PFID', () => {
    expect(zero()).toBe('00000000000000000000000000000000');
  });
});

describe('generate', () => {
  test('generates a valid PFID with partition', () => {
    const partition = 123_456_789;
    const pfid = generate(partition);

    expect(isPfid(pfid)).toBe(true);
    expect(extractPartition(pfid)).toBe(partition);
  });

  test('generates unique PFIDs', () => {
    const partition = 1;
    const pfid1 = generate(partition);
    const pfid2 = generate(partition);

    expect(pfid1).not.toBe(pfid2);
    expect(isPfid(pfid1)).toBe(true);
    expect(isPfid(pfid2)).toBe(true);
  });

  test('throws on invalid partition', () => {
    expect(() => generate(-1)).toThrow();
    expect(() => generate(1_073_741_824)).toThrow();
  });
});

describe('generateWithTimestamp', () => {
  test('generates a PFID with partition and timestamp', () => {
    const partition = 123_456_789;
    const timestamp = 1_234_567_890_000;
    const pfid = generateWithTimestamp(partition, timestamp);

    expect(isPfid(pfid)).toBe(true);
    expect(extractPartition(pfid)).toBe(partition);
  });

  test('throws on invalid timestamp', () => {
    expect(() => generateWithTimestamp(1, -1)).toThrow();
    expect(() => generateWithTimestamp(1, 281_474_976_710_656)).toThrow();
  });
});

describe('generateExample', () => {
  test('generates an example PFID', () => {
    const pfid = generateExample();

    expect(isPfid(pfid)).toBe(true);
    expect(extractPartition(pfid)).toBe(123_456_789);
  });
});

describe('generateRelated', () => {
  test('generates a PFID with the same partition', () => {
    const originalPfid = generate(123_456_789);
    const relatedPfid = generateRelated(originalPfid);

    expect(isPfid(relatedPfid)).toBe(true);
    expect(extractPartition(relatedPfid)).toBe(
      extractPartition(originalPfid)
    );
  });
});

describe('generateRoot', () => {
  test('generates a PFID with random partition', () => {
    const pfid = generateRoot();

    expect(isPfid(pfid)).toBe(true);
    const partition = extractPartition(pfid);
    expect(partition).toBeGreaterThanOrEqual(0);
    expect(partition).toBeLessThan(1_073_741_824);
  });
});

describe('generateBinary', () => {
  test('generates a binary PFID', () => {
    const partition = 123_456_789;
    const binary = generateBinary(partition);

    expect(binary.length).toBe(20);
    const encoded = encode(binary);
    expect(isPfid(encoded)).toBe(true);
  });
});

describe('generateBinaryWithTimestamp', () => {
  test('generates a binary PFID with timestamp', () => {
    const partition = 123_456_789;
    const timestamp = 1_234_567_890_000;
    const binary = generateBinaryWithTimestamp(partition, timestamp);

    expect(binary.length).toBe(20);
    const encoded = encode(binary);
    expect(isPfid(encoded)).toBe(true);
  });
});

describe('isPfid', () => {
  test('returns true for valid PFID', () => {
    const pfid = generate(1);
    expect(isPfid(pfid)).toBe(true);
  });

  test('returns false for invalid strings', () => {
    expect(isPfid('invalid')).toBe(false);
    expect(isPfid('')).toBe(false);
    expect(isPfid('01an4z07byd9df0k79ka1307sr9x4mv')).toBe(false);
  });

  test('returns false for non-strings', () => {
    expect(isPfid(123 as any)).toBe(false);
    expect(isPfid(null as any)).toBe(false);
    expect(isPfid({} as any)).toBe(false);
  });

  test('returns false for strings starting with 8-9', () => {
    expect(isPfid('8' + '0'.repeat(31))).toBe(false);
    expect(isPfid('9' + '0'.repeat(31))).toBe(false);
  });
});

describe('encode', () => {
  test('encodes a valid binary', () => {
    const partition = 123_456_789;
    const binary = generateBinary(partition);
    const encoded = encode(binary);

    expect(isPfid(encoded)).toBe(true);
    expect(extractPartition(encoded)).toBe(partition);
  });

  test('throws error for invalid binary size', () => {
    expect(() => encode(Buffer.from([1, 2, 3]))).toThrow(PfidError);
    expect(() => encode(Buffer.from([1, 2, 3]))).toThrow(/invalid binary/);
  });

  test('throws error for non-binary', () => {
    expect(() => encode('not binary' as any)).toThrow(PfidError);
    expect(() => encode(123 as any)).toThrow(PfidError);
  });
});

describe('decode', () => {
  test('decodes a valid PFID', () => {
    const partition = 123_456_789;
    const pfid = generate(partition);
    const binary = decode(pfid);

    expect(binary.length).toBe(20);
    const encoded = encode(binary);
    expect(encoded).toBe(pfid);
  });

  test('throws error for invalid PFID', () => {
    expect(() => decode('invalid')).toThrow(PfidError);
    expect(() => decode('invalid')).toThrow(/invalid PFID/);
    expect(() => decode('')).toThrow(PfidError);
  });

  test('throws error for non-string', () => {
    expect(() => decode(123 as any)).toThrow(PfidError);
  });
});

describe('extractPartition', () => {
  test('extracts partition from valid PFID', () => {
    const partition = 123_456_789;
    const pfid = generate(partition);
    const extracted = extractPartition(pfid);

    expect(extracted).toBe(partition);
  });

  test('throws error for invalid PFID', () => {
    expect(() => extractPartition('invalid')).toThrow(PfidError);
    expect(() => extractPartition('invalid')).toThrow(/invalid PFID/);
  });
});

describe('generatePartition', () => {
  test('generates a valid partition', () => {
    const partition = generatePartition();

    expect(partition).toBeGreaterThanOrEqual(0);
    expect(partition).toBeLessThan(1_073_741_824);
  });

  test('generates different partitions', () => {
    const partitions: number[] = [];
    for (let i = 0; i < 10; i++) {
      partitions.push(generatePartition());
    }
    const uniquePartitions = [...new Set(partitions)];

    // Very unlikely to have duplicates, but possible
    expect(uniquePartitions.length).toBeGreaterThanOrEqual(8);
  });
});

describe('round-trip encoding/decoding', () => {
  test('encode and decode are inverse operations', () => {
    const partition = 123_456_789;
    const pfid = generate(partition);

    const binary = decode(pfid);
    const encoded = encode(binary);
    expect(encoded).toBe(pfid);
  });

  test('binary encode and decode are inverse operations', () => {
    const partition = 123_456_789;
    const binary = generateBinary(partition);

    const encoded = encode(binary);
    const decoded = decode(encoded);
    expect(decoded).toEqual(binary);
  });
});

describe('partition consistency', () => {
  test('all generated PFIDs with same partition have same partition', () => {
    const partition = 123_456_789;

    const pfids: string[] = [];
    for (let i = 0; i < 10; i++) {
      pfids.push(generate(partition));
    }

    const partitions = pfids.map((pfid) => extractPartition(pfid));

    expect(partitions.every((p) => p === partition)).toBe(true);
  });
});
