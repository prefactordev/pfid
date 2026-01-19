import { randomBytes } from 'crypto';
import { PfidError } from './errors';

// Type definitions
export type BinaryPfid = Buffer; // 20 bytes (160 bits)
export type Partition = number; // 0 to 1,073,741,823
export type Timestamp = number; // 0 to 281,474,976,710,655
export type Pfid = string; // 32 character Crockford Base32 string

// Constants
const MAX_TIMESTAMP = 281_474_976_710_655; // 2^48 - 1
const MAX_PARTITION = 1_073_741_823; // 2^30 - 1

// Crockford Base32 encoding/decoding
const ENCODE_CHARS = '0123456789abcdefghjkmnpqrstvwxyz';
const DECODE_MAP: Record<string, number> = {
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, 'a': 10, 'b': 11, 'c': 12, 'd': 13, 'e': 14, 'f': 15,
  'g': 16, 'h': 17, 'j': 18, 'k': 19, 'm': 20, 'n': 21, 'p': 22, 'q': 23,
  'r': 24, 's': 25, 't': 26, 'v': 27, 'w': 28, 'x': 29, 'y': 30, 'z': 31,
};

function encodeChar(value: number): string {
  return ENCODE_CHARS[value];
}

function decodeChar(char: string): number {
  const value = DECODE_MAP[char.toLowerCase()];
  if (value === undefined) {
    throw new Error(`Invalid character: ${char}`);
  }
  return value;
}

// Validation guards
function isValidTimestamp(timestamp: number): boolean {
  return Number.isInteger(timestamp) && timestamp >= 0 && timestamp <= MAX_TIMESTAMP;
}

function isValidPartition(partition: number): boolean {
  return Number.isInteger(partition) && partition >= 0 && partition <= MAX_PARTITION;
}

/**
 * A zero PFID -- probably don't actually use it, but if you need a placeholder.
 */
export function zero(): Pfid {
  return '00000000000000000000000000000000';
}

/**
 * Generate a Crockford Base32 encoded PFID string with current time.
 */
export function generate(partition: Partition): Pfid {
  if (!isValidPartition(partition)) {
    throw new Error(`Invalid partition: ${partition}`);
  }
  return unsafeEncode(generateBinary(partition));
}

/**
 * Generate a Crockford Base32 encoded PFID string with a provided Unix timestamp.
 */
export function generateWithTimestamp(partition: Partition, timestamp: Timestamp): Pfid {
  if (!isValidPartition(partition)) {
    throw new Error(`Invalid partition: ${partition}`);
  }
  if (!isValidTimestamp(timestamp)) {
    throw new Error(`Invalid timestamp: ${timestamp}`);
  }
  return unsafeEncode(generateBinaryWithTimestamp(partition, timestamp));
}

/**
 * Generate an ID suitable for use in an example -- it's well into the past.
 */
export function generateExample(): Pfid {
  return generateWithTimestamp(123_456_789, 1_234_567_890_000);
}

/**
 * Generate an ID with the same partition as an existing PFID.
 */
export function generateRelated(existingPfid: Pfid): Pfid {
  return generate(extractPartitionOrThrow(existingPfid));
}

/**
 * Generate an ID with a random partition.
 */
export function generateRoot(): Pfid {
  return generate(generatePartition());
}

/**
 * Generate a binary PFID with current time.
 */
export function generateBinary(partition: Partition): BinaryPfid {
  if (!isValidPartition(partition)) {
    throw new Error(`Invalid partition: ${partition}`);
  }
  const timestamp = Date.now();
  return generateBinaryWithTimestamp(partition, timestamp);
}

/**
 * Generate a binary PFID with a provided Unix timestamp.
 * 
 * Binary layout (20 bytes):
 * - Bytes 0-5: timestamp (48 bits, big-endian)
 * - Bytes 6-9: partition (32 bits, big-endian, but only 30 bits used)
 * - Bytes 10-19: randomness (80 bits)
 */
export function generateBinaryWithTimestamp(partition: Partition, timestamp: Timestamp): BinaryPfid {
  if (!isValidPartition(partition)) {
    throw new Error(`Invalid partition: ${partition}`);
  }
  if (!isValidTimestamp(timestamp)) {
    throw new Error(`Invalid timestamp: ${timestamp}`);
  }

  const buffer = Buffer.allocUnsafe(20);

  // Write timestamp (48 bits = 6 bytes) - big endian
  // JavaScript bitwise operators only work on 32 bits, so we need to use division for high bits
  buffer[0] = Math.floor(timestamp / 0x10000000000) & 0xff; // >> 40
  buffer[1] = Math.floor(timestamp / 0x100000000) & 0xff;   // >> 32
  buffer[2] = (timestamp >> 24) & 0xff;
  buffer[3] = (timestamp >> 16) & 0xff;
  buffer[4] = (timestamp >> 8) & 0xff;
  buffer[5] = timestamp & 0xff;

  // Write partition (32 bits = 4 bytes) - big endian
  buffer.writeUInt32BE(partition, 6);

  // Write randomness (80 bits = 10 bytes)
  randomBytes(10).copy(buffer, 10);

  return buffer;
}

/**
 * Check if a string is a valid PFID.
 * Valid PFID: 32 characters, first character must be 0-7, rest must be valid Crockford Base32.
 */
export function isPfid(string: unknown): boolean {
  if (typeof string !== 'string') {
    return false;
  }

  if (string.length !== 32) {
    return false;
  }

  // First character must be 0-7
  if (string[0] < '0' || string[0] > '7') {
    return false;
  }

  // All characters must be valid Crockford Base32
  const validPattern = /^[0-7][0-9abcdefghjkmnpqrstvwxyz]{31}$/;
  return validPattern.test(string);
}

/**
 * Encode a binary PFID to a Crockford Base32 string.
 */
export function encode(binary: BinaryPfid): { ok: true; value: Pfid } | { ok: false; error: PfidError } {
  if (!Buffer.isBuffer(binary) || binary.length !== 20) {
    return { ok: false, error: PfidError.make('invalid_binary', binary) };
  }

  try {
    const encoded = unsafeEncode(binary);
    if (isPfid(encoded)) {
      return { ok: true, value: encoded };
    } else {
      return { ok: false, error: PfidError.make('invalid_binary', binary) };
    }
  } catch (error) {
    return { ok: false, error: PfidError.make('invalid_binary', binary) };
  }
}

/**
 * Decode a Crockford Base32 PFID string to binary.
 */
export function decode(pfid: string): { ok: true; value: BinaryPfid } | { ok: false; error: PfidError } {
  if (typeof pfid !== 'string' || pfid.length !== 32) {
    return { ok: false, error: PfidError.make('invalid_pfid', pfid) };
  }

  // First character must be 0-7
  if (pfid[0] < '0' || pfid[0] > '7') {
    return { ok: false, error: PfidError.make('invalid_pfid', pfid) };
  }

  try {
    const binary = unsafeDecode(pfid);
    return { ok: true, value: binary };
  } catch (error) {
    return { ok: false, error: PfidError.make('invalid_pfid', pfid) };
  }
}

/**
 * Extract partition from a PFID string.
 */
export function extractPartition(pfid: string): { ok: true; value: Partition } | { ok: false; error: PfidError } {
  if (!isPfid(pfid)) {
    return { ok: false, error: PfidError.make('invalid_pfid', pfid) };
  }

  try {
    // Extract the partition portion (characters 10-15, 6 characters = 30 bits)
    const partitionStr = pfid.substring(10, 16);
    const result = decodePartition(partitionStr);
    if (result.ok) {
      return result;
    } else {
      return { ok: false, error: PfidError.make('invalid_pfid', pfid) };
    }
  } catch (error) {
    return { ok: false, error: PfidError.make('invalid_pfid', pfid) };
  }
}

/**
 * Extract partition from a PFID string, throwing on error.
 */
export function extractPartitionOrThrow(pfid: string): Partition {
  const result = extractPartition(pfid);
  if (result.ok) {
    return result.value;
  } else {
    throw result.error;
  }
}

/**
 * Generate a random partition.
 */
export function generatePartition(): Partition {
  const buffer = randomBytes(4);
  // Clear top 2 bits to ensure partition is in valid range
  buffer[0] = buffer[0] & 0x3f; // Keep only bottom 6 bits of first byte
  // Read as 32-bit unsigned integer, but only use 30 bits
  const partition = buffer.readUInt32BE(0) & 0x3fffffff;
  return partition;
}

// Internal encoding/decoding functions

/**
 * Unsafe encode - assumes valid 20-byte buffer.
 * Encodes 160 bits as 32 characters of Crockford Base32.
 * 
 * Bit layout (reading from binary):
 * - t1::3, t2::5, t3::5, t4::5, t5::5, t6::5, t7::5, t8::5, t9::5, t10::5 (48 bits timestamp)
 * - 0::2 (2 bits padding)
 * - p1::5, p2::5, p3::5, p4::5, p5::5, p6::5 (30 bits partition)
 * - r1::5, r2::5, r3::5, r4::5, r5::5, r6::5, r7::5, r8::5, r9::5, r10::5, r11::5, r12::5, r13::5, r14::5, r15::5, r16::5 (80 bits randomness)
 */
function unsafeEncode(binary: Buffer): Pfid {
  // Helper to read bits across byte boundaries
  let bitOffset = 0;

  function readBits(count: number): number {
    let value = 0;
    for (let i = 0; i < count; i++) {
      const byteIndex = Math.floor(bitOffset / 8);
      const bitIndex = 7 - (bitOffset % 8);
      const bit = (binary[byteIndex] >> bitIndex) & 1;
      value = (value << 1) | bit;
      bitOffset++;
    }
    return value;
  }

  // Read timestamp: 3 + 5*9 = 48 bits
  const t1 = readBits(3);
  const t2 = readBits(5);
  const t3 = readBits(5);
  const t4 = readBits(5);
  const t5 = readBits(5);
  const t6 = readBits(5);
  const t7 = readBits(5);
  const t8 = readBits(5);
  const t9 = readBits(5);
  const t10 = readBits(5);

  // Skip 2 padding bits
  readBits(2);

  // Read partition: 5*6 = 30 bits
  const p1 = readBits(5);
  const p2 = readBits(5);
  const p3 = readBits(5);
  const p4 = readBits(5);
  const p5 = readBits(5);
  const p6 = readBits(5);

  // Read randomness: 5*16 = 80 bits
  const r1 = readBits(5);
  const r2 = readBits(5);
  const r3 = readBits(5);
  const r4 = readBits(5);
  const r5 = readBits(5);
  const r6 = readBits(5);
  const r7 = readBits(5);
  const r8 = readBits(5);
  const r9 = readBits(5);
  const r10 = readBits(5);
  const r11 = readBits(5);
  const r12 = readBits(5);
  const r13 = readBits(5);
  const r14 = readBits(5);
  const r15 = readBits(5);
  const r16 = readBits(5);

  return (
    encodeChar(t1) + encodeChar(t2) + encodeChar(t3) + encodeChar(t4) + encodeChar(t5) +
    encodeChar(t6) + encodeChar(t7) + encodeChar(t8) + encodeChar(t9) + encodeChar(t10) +
    encodeChar(p1) + encodeChar(p2) + encodeChar(p3) + encodeChar(p4) + encodeChar(p5) + encodeChar(p6) +
    encodeChar(r1) + encodeChar(r2) + encodeChar(r3) + encodeChar(r4) + encodeChar(r5) + encodeChar(r6) +
    encodeChar(r7) + encodeChar(r8) + encodeChar(r9) + encodeChar(r10) + encodeChar(r11) + encodeChar(r12) +
    encodeChar(r13) + encodeChar(r14) + encodeChar(r15) + encodeChar(r16)
  );
}

/**
 * Unsafe decode - assumes valid 32-character string.
 * Decodes 32 characters of Crockford Base32 to 160 bits (20 bytes).
 * 
 * The decode process reads each character as a byte, decodes it to a 5-bit value,
 * then packs those bits back into the binary format.
 */
function unsafeDecode(pfid: string): BinaryPfid {
  // Decode each character to its 5-bit value (except t1 which is 3 bits)
  const t1 = decodeChar(pfid[0]);  // 3 bits
  const t2 = decodeChar(pfid[1]);   // 5 bits
  const t3 = decodeChar(pfid[2]);   // 5 bits
  const t4 = decodeChar(pfid[3]);   // 5 bits
  const t5 = decodeChar(pfid[4]);   // 5 bits
  const t6 = decodeChar(pfid[5]);   // 5 bits
  const t7 = decodeChar(pfid[6]);   // 5 bits
  const t8 = decodeChar(pfid[7]);   // 5 bits
  const t9 = decodeChar(pfid[8]);   // 5 bits
  const t10 = decodeChar(pfid[9]);  // 5 bits

  const p1 = decodeChar(pfid[10]);  // 5 bits
  const p2 = decodeChar(pfid[11]);  // 5 bits
  const p3 = decodeChar(pfid[12]);  // 5 bits
  const p4 = decodeChar(pfid[13]);  // 5 bits
  const p5 = decodeChar(pfid[14]);  // 5 bits
  const p6 = decodeChar(pfid[15]);  // 5 bits

  const r1 = decodeChar(pfid[16]);  // 5 bits
  const r2 = decodeChar(pfid[17]);  // 5 bits
  const r3 = decodeChar(pfid[18]);  // 5 bits
  const r4 = decodeChar(pfid[19]);  // 5 bits
  const r5 = decodeChar(pfid[20]);  // 5 bits
  const r6 = decodeChar(pfid[21]);  // 5 bits
  const r7 = decodeChar(pfid[22]);  // 5 bits
  const r8 = decodeChar(pfid[23]);  // 5 bits
  const r9 = decodeChar(pfid[24]);  // 5 bits
  const r10 = decodeChar(pfid[25]); // 5 bits
  const r11 = decodeChar(pfid[26]); // 5 bits
  const r12 = decodeChar(pfid[27]); // 5 bits
  const r13 = decodeChar(pfid[28]); // 5 bits
  const r14 = decodeChar(pfid[29]); // 5 bits
  const r15 = decodeChar(pfid[30]); // 5 bits
  const r16 = decodeChar(pfid[31]); // 5 bits

  // Helper to write bits across byte boundaries
  const buffer = Buffer.alloc(20, 0);
  let bitOffset = 0;

  function writeBits(value: number, count: number): void {
    for (let i = count - 1; i >= 0; i--) {
      const byteIndex = Math.floor(bitOffset / 8);
      const bitIndex = 7 - (bitOffset % 8);
      const bit = (value >> i) & 1;
      buffer[byteIndex] |= (bit << bitIndex);
      bitOffset++;
    }
  }

  // Write timestamp: 3 + 5*9 = 48 bits
  writeBits(t1, 3);
  writeBits(t2, 5);
  writeBits(t3, 5);
  writeBits(t4, 5);
  writeBits(t5, 5);
  writeBits(t6, 5);
  writeBits(t7, 5);
  writeBits(t8, 5);
  writeBits(t9, 5);
  writeBits(t10, 5);

  // Write 2 padding bits (0)
  writeBits(0, 2);

  // Write partition: 5*6 = 30 bits
  writeBits(p1, 5);
  writeBits(p2, 5);
  writeBits(p3, 5);
  writeBits(p4, 5);
  writeBits(p5, 5);
  writeBits(p6, 5);

  // Write randomness: 5*16 = 80 bits
  writeBits(r1, 5);
  writeBits(r2, 5);
  writeBits(r3, 5);
  writeBits(r4, 5);
  writeBits(r5, 5);
  writeBits(r6, 5);
  writeBits(r7, 5);
  writeBits(r8, 5);
  writeBits(r9, 5);
  writeBits(r10, 5);
  writeBits(r11, 5);
  writeBits(r12, 5);
  writeBits(r13, 5);
  writeBits(r14, 5);
  writeBits(r15, 5);
  writeBits(r16, 5);

  return buffer;
}

/**
 * Decode partition from 6-character encoded partition string.
 */
function decodePartition(partitionStr: string): { ok: true; value: Partition } | { ok: false; error: PfidError } {
  if (typeof partitionStr !== 'string' || partitionStr.length !== 6) {
    return { ok: false, error: PfidError.make('invalid_partition', partitionStr) };
  }

  try {
    const p1 = decodeChar(partitionStr[0]);
    const p2 = decodeChar(partitionStr[1]);
    const p3 = decodeChar(partitionStr[2]);
    const p4 = decodeChar(partitionStr[3]);
    const p5 = decodeChar(partitionStr[4]);
    const p6 = decodeChar(partitionStr[5]);

    // Reconstruct the 30-bit partition value
    // The partition is stored as: 0 (2 bits) + p1 (5 bits) + p2 (5 bits) + ... + p6 (5 bits)
    const buffer = Buffer.allocUnsafe(4);
    buffer[0] = (0 << 6) | (p1 << 1) | (p2 >> 4);
    buffer[1] = ((p2 & 0x0f) << 4) | (p3 >> 1);
    buffer[2] = ((p3 & 0x01) << 7) | (p4 << 2) | (p5 >> 3);
    buffer[3] = ((p5 & 0x07) << 5) | (p6 >> 0);

    // Read as 32-bit unsigned integer, mask to 30 bits
    const partition = buffer.readUInt32BE(0) & 0x3fffffff;
    return { ok: true, value: partition };
  } catch (error) {
    return { ok: false, error: PfidError.make('invalid_partition', partitionStr) };
  }
}
