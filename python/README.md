# PFID - Python

A ULID-like identifier format with partition support, implemented in Python.

## Installation

```bash
pip install pfid
```

Or for development:

```bash
pip install -e ".[dev]"
```

## Usage

### Basic Generation

```python
from pfid import generate, generate_root, generate_related

# Generate a PFID with a specific partition
pfid = generate(partition=123_456_789)
# e.g., "013xrzp12g3nqk8nzzzzzzzzzzzzzzzz"

# Generate a PFID with a random partition
root_pfid = generate_root()

# Generate a related PFID (same partition as existing)
related_pfid = generate_related(root_pfid)
```

### Partition Extraction

```python
from pfid import extract_partition, generate

pfid = generate(partition=123_456_789)
partition = extract_partition(pfid)
assert partition == 123_456_789
```

### Encoding and Decoding

```python
from pfid import encode, decode, generate_binary

# Generate binary PFID and encode to string
binary = generate_binary(partition=123_456_789)
pfid = encode(binary)

# Decode string PFID back to binary
decoded_binary = decode(pfid)
assert decoded_binary == binary
```

### Validation

```python
from pfid import is_pfid

assert is_pfid("013xrzp12g3nqk8nzzzzzzzzzzzzzzzz")
assert not is_pfid("invalid")
assert not is_pfid(123)
```

### Zero PFID

```python
from pfid import zero

# Get a zero PFID (useful as a placeholder)
zero_pfid = zero()
assert zero_pfid == "00000000000000000000000000000000"
```

## PFID Structure

PFID consists of 160 bits (20 bytes) encoded as 32 Crockford Base32 characters:

- **48 bits** for timestamp (milliseconds since Unix epoch)
- **30 bits** for partition (allows up to 1,073,741,824 partitions)
- **2 bits** padding
- **80 bits** for randomness

## API Reference

### Functions

- `generate(partition: int) -> str` - Generate a PFID with current time
- `generate_with_timestamp(partition: int, timestamp: int) -> str` - Generate with specific timestamp
- `generate_example() -> str` - Generate an example PFID (for documentation)
- `generate_related(existing_pfid: str) -> str` - Generate with same partition
- `generate_root() -> str` - Generate with random partition
- `generate_binary(partition: int) -> bytes` - Generate binary PFID
- `generate_binary_with_timestamp(partition: int, timestamp: int) -> bytes` - Generate binary with timestamp
- `generate_partition() -> int` - Generate a random partition
- `encode(binary: bytes) -> str` - Encode binary to string
- `decode(pfid: str) -> bytes` - Decode string to binary
- `extract_partition(pfid: str) -> int` - Extract partition from PFID
- `is_pfid(value: any) -> bool` - Check if value is a valid PFID
- `zero() -> str` - Return the zero PFID

### Exceptions

- `PfidError` - Base exception for PFID errors
  - `code: PfidErrorCode` - The error code
  - `PfidErrorCode.INVALID_BINARY` - Invalid binary input
  - `PfidErrorCode.INVALID_PFID` - Invalid PFID string
  - `PfidErrorCode.INVALID_PARTITION` - Invalid partition value

## Development

### Setup

```bash
# Install development dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run tests with coverage
pytest --cov=pfid

# Type check
mypy src/pfid

# Lint
ruff check src/pfid tests
```

## License

MIT License
