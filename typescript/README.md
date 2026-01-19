# PFID TypeScript Library

A TypeScript implementation of PFID, matching the Elixir implementation.

## Overview

PFID is a ULID-like identifier format with partition support. It consists of:
- 48 bits for timestamp (milliseconds since Unix epoch)
- 30 bits for partition (allows up to 1,073,741,824 partitions)
- 80 bits for randomness
- Encoded as 32 characters using Crockford Base32

## Installation

```bash
pnpm install
```

## Usage

```typescript
import {
  generate,
  generateWithTimestamp,
  generateExample,
  generateRelated,
  generateRoot,
  isPfid,
  extractPartition,
  extractPartitionOrThrow,
  encode,
  decode,
} from './src';

// Generate a PFID with a partition
const pfid = generate(123_456_789);
console.log(pfid); // e.g., "01an4z07byd9df0k79ka1307sr9x4mv3"

// Generate with a specific timestamp
const pfid2 = generateWithTimestamp(123_456_789, 1_234_567_890_000);

// Generate an example PFID
const example = generateExample();

// Generate a related PFID (same partition)
const related = generateRelated(pfid);

// Generate a root PFID (random partition)
const root = generateRoot();

// Validate a PFID
if (isPfid(pfid)) {
  console.log('Valid PFID');
}

// Extract partition
const partition = extractPartitionOrThrow(pfid);
console.log(partition); // 123456789

// Or with error handling
const result = extractPartition(pfid);
if (result.ok) {
  console.log(result.value);
}

// Encode binary to PFID
const binary = generateBinary(123_456_789);
const encodeResult = encode(binary);
if (encodeResult.ok) {
  console.log(encodeResult.value);
}

// Decode PFID to binary
const decodeResult = decode(pfid);
if (decodeResult.ok) {
  const binary = decodeResult.value;
  console.log(binary.length); // 20 bytes
}
```

## API Reference

### Generation Functions

- `zero()`: Returns a zero PFID (`"00000000000000000000000000000000"`)
- `generate(partition: Partition)`: Generate a PFID with current time
- `generateWithTimestamp(partition: Partition, timestamp: Timestamp)`: Generate with specific timestamp
- `generateExample()`: Generate an example PFID (well into the past)
- `generateRelated(existingPfid: Pfid)`: Generate with same partition as existing PFID
- `generateRoot()`: Generate with random partition
- `generateBinary(partition: Partition)`: Generate binary PFID (20 bytes)
- `generateBinaryWithTimestamp(partition: Partition, timestamp: Timestamp)`: Generate binary with timestamp
- `generatePartition()`: Generate a random partition (0 to 1,073,741,823)

### Validation and Conversion

- `isPfid(string: unknown)`: Check if a string is a valid PFID
- `encode(binary: BinaryPfid)`: Encode binary to PFID string (returns Result)
- `decode(pfid: string)`: Decode PFID string to binary (returns Result)
- `extractPartition(pfid: string)`: Extract partition from PFID (returns Result)
- `extractPartitionOrThrow(pfid: string)`: Extract partition, throws on error

### Types

- `Pfid`: String type for PFID (32 characters)
- `BinaryPfid`: Buffer type (20 bytes)
- `Partition`: Number type (0 to 1,073,741,823)
- `Timestamp`: Number type (0 to 281,474,976,710,655)

### Error Handling

The library uses a Result pattern for operations that can fail:

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

Functions that return Results:
- `encode()`: Returns `Result<Pfid, PfidError>`
- `decode()`: Returns `Result<BinaryPfid, PfidError>`
- `extractPartition()`: Returns `Result<Partition, PfidError>`

## Development

### Setup

This project uses [mise](https://mise.jdx.dev/) for managing development environments.

1. Install tools:
   ```bash
   mise install
   ```

2. Install dependencies:
   ```bash
   cd typescript
   pnpm install
   ```

### Running Tests

```bash
# Run all tests
mise run typescript:test

# Or directly
cd typescript
pnpm test
```

### Type Checking

```bash
mise run typescript:typecheck
```

### Building

```bash
mise run typescript:build
```

## License

MIT License - See LICENSE file for details.
