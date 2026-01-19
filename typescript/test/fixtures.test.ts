import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  encode,
  decode,
  extractPartitionOrThrow,
  isPfid,
} from '../src';

const fixturesPath = join(__dirname, '..', '..', 'fixtures', 'pfid_fixtures.csv');

function validateFixture(line: string): void {
  const [timestampStr, partitionStr, randomnessHex, expectedPfid] = line.split(',');

  const timestamp = parseInt(timestampStr, 10);
  const partition = parseInt(partitionStr, 10);
  const randomness = Buffer.from(randomnessHex, 'hex');

  // Construct binary PFID
  // Layout: 48 bits timestamp + 32 bits partition + 80 bits randomness
  const binary = Buffer.alloc(20, 0);

  // Write timestamp (48 bits = 6 bytes) - big endian
  // JavaScript bitwise operators only work on 32 bits, so we need to use division for high bits
  binary[0] = Math.floor(timestamp / 0x10000000000) & 0xff; // >> 40
  binary[1] = Math.floor(timestamp / 0x100000000) & 0xff;   // >> 32
  binary[2] = (timestamp >> 24) & 0xff;
  binary[3] = (timestamp >> 16) & 0xff;
  binary[4] = (timestamp >> 8) & 0xff;
  binary[5] = timestamp & 0xff;

  // Write partition (32 bits = 4 bytes) - big endian
  binary.writeUInt32BE(partition, 6);

  // Write randomness (80 bits = 10 bytes)
  randomness.copy(binary, 10);

  // Test encoding
  const encodeResult = encode(binary);
  expect(encodeResult.ok).toBe(true);
  if (!encodeResult.ok) {
    throw new Error('Encoding failed');
  }
  expect(
    encodeResult.value,
    `Encoded PFID does not match expected value. Got: ${encodeResult.value}, Expected: ${expectedPfid}`
  ).toBe(expectedPfid);

  // Test decoding
  const decodeResult = decode(expectedPfid);
  expect(decodeResult.ok).toBe(true);
  if (!decodeResult.ok) {
    throw new Error('Decoding failed');
  }
  expect(
    decodeResult.value,
    'Decoded binary does not match original'
  ).toEqual(binary);

  // Test partition extraction
  const extractedPartition = extractPartitionOrThrow(expectedPfid);
  expect(
    extractedPartition,
    `Extracted partition does not match expected value. Got: ${extractedPartition}, Expected: ${partition}`
  ).toBe(partition);

  // Test is_pfid?
  expect(
    isPfid(expectedPfid),
    'isPfid should return true for valid PFID'
  ).toBe(true);
}

describe('fixtures validation', () => {
  test('all fixtures are valid', () => {
    const fixturesContent = readFileSync(fixturesPath, 'utf-8');
    const lines = fixturesContent.split('\n');

    // Skip header line
    const dataLines = lines.slice(1);

    for (const line of dataLines) {
      const trimmedLine = line.trim();
      if (trimmedLine !== '') {
        validateFixture(trimmedLine);
      }
    }
  });
});
