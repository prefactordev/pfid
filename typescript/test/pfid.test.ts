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
  extractPartitionOrThrow,
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
    expect(extractPartitionOrThrow(pfid)).toBe(partition);
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
    expect(extractPartitionOrThrow(pfid)).toBe(partition);
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
    expect(extractPartitionOrThrow(pfid)).toBe(123_456_789);
  });
});

describe('generateRelated', () => {
  test('generates a PFID with the same partition', () => {
    const originalPfid = generate(123_456_789);
    const relatedPfid = generateRelated(originalPfid);

    expect(isPfid(relatedPfid)).toBe(true);
    expect(extractPartitionOrThrow(relatedPfid)).toBe(
      extractPartitionOrThrow(originalPfid)
    );
  });
});

describe('generateRoot', () => {
  test('generates a PFID with random partition', () => {
    const pfid = generateRoot();

    expect(isPfid(pfid)).toBe(true);
    const partition = extractPartitionOrThrow(pfid);
    expect(partition).toBeGreaterThanOrEqual(0);
    expect(partition).toBeLessThan(1_073_741_824);
  });
});

describe('generateBinary', () => {
  test('generates a binary PFID', () => {
    const partition = 123_456_789;
    const binary = generateBinary(partition);

    expect(binary.length).toBe(20);
    const result = encode(binary);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(isPfid(result.value)).toBe(true);
    }
  });
});

describe('generateBinaryWithTimestamp', () => {
  test('generates a binary PFID with timestamp', () => {
    const partition = 123_456_789;
    const timestamp = 1_234_567_890_000;
    const binary = generateBinaryWithTimestamp(partition, timestamp);

    expect(binary.length).toBe(20);
    const result = encode(binary);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(isPfid(result.value)).toBe(true);
    }
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
    const result = encode(binary);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(isPfid(result.value)).toBe(true);
      expect(extractPartitionOrThrow(result.value)).toBe(partition);
    }
  });

  test('returns error for invalid binary size', () => {
    const result = encode(Buffer.from([1, 2, 3]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_binary');
    }
  });

  test('returns error for non-binary', () => {
    const result1 = encode('not binary' as any);
    expect(result1.ok).toBe(false);
    if (!result1.ok) {
      expect(result1.error.code).toBe('invalid_binary');
    }

    const result2 = encode(123 as any);
    expect(result2.ok).toBe(false);
    if (!result2.ok) {
      expect(result2.error.code).toBe('invalid_binary');
    }
  });
});

describe('decode', () => {
  test('decodes a valid PFID', () => {
    const partition = 123_456_789;
    const pfid = generate(partition);
    const result = decode(pfid);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(20);
      const encodeResult = encode(result.value);
      expect(encodeResult.ok).toBe(true);
      if (encodeResult.ok) {
        expect(encodeResult.value).toBe(pfid);
      }
    }
  });

  test('returns error for invalid PFID', () => {
    const result1 = decode('invalid');
    expect(result1.ok).toBe(false);
    if (!result1.ok) {
      expect(result1.error.code).toBe('invalid_pfid');
    }

    const result2 = decode('');
    expect(result2.ok).toBe(false);
    if (!result2.ok) {
      expect(result2.error.code).toBe('invalid_pfid');
    }
  });

  test('returns error for non-string', () => {
    const result = decode(123 as any);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_pfid');
    }
  });
});

describe('extractPartition', () => {
  test('extracts partition from valid PFID', () => {
    const partition = 123_456_789;
    const pfid = generate(partition);
    const result = extractPartition(pfid);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(partition);
    }
  });

  test('returns error for invalid PFID', () => {
    const result = extractPartition('invalid');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_pfid');
    }
  });
});

describe('extractPartitionOrThrow', () => {
  test('extracts partition from valid PFID', () => {
    const partition = 123_456_789;
    const pfid = generate(partition);

    expect(extractPartitionOrThrow(pfid)).toBe(partition);
  });

  test('throws on invalid PFID', () => {
    expect(() => extractPartitionOrThrow('invalid')).toThrow(PfidError);
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

    const decodeResult = decode(pfid);
    expect(decodeResult.ok).toBe(true);
    if (decodeResult.ok) {
      const encodeResult = encode(decodeResult.value);
      expect(encodeResult.ok).toBe(true);
      if (encodeResult.ok) {
        expect(encodeResult.value).toBe(pfid);
      }
    }
  });

  test('binary encode and decode are inverse operations', () => {
    const partition = 123_456_789;
    const binary = generateBinary(partition);

    const encodeResult = encode(binary);
    expect(encodeResult.ok).toBe(true);
    if (encodeResult.ok) {
      const decodeResult = decode(encodeResult.value);
      expect(decodeResult.ok).toBe(true);
      if (decodeResult.ok) {
        expect(decodeResult.value).toEqual(binary);
      }
    }
  });
});

describe('partition consistency', () => {
  test('all generated PFIDs with same partition have same partition', () => {
    const partition = 123_456_789;

    const pfids: string[] = [];
    for (let i = 0; i < 10; i++) {
      pfids.push(generate(partition));
    }

    const partitions = pfids.map((pfid) => extractPartitionOrThrow(pfid));

    expect(partitions.every((p) => p === partition)).toBe(true);
  });
});
