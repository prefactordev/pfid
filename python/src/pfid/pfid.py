"""PFID - A ULID-like identifier format with partition support.

PFID consists of:
- 48 bits for timestamp (milliseconds since Unix epoch)
- 30 bits for partition (allows up to 1,073,741,824 partitions)
- 80 bits for randomness
- Encoded as 32 characters using Crockford Base32
"""

import re
import secrets
import time
from typing import NewType

from pfid.errors import PfidError, PfidErrorCode

# Type definitions
BinaryPfid = NewType("BinaryPfid", bytes)  # 20 bytes (160 bits)
Partition = NewType("Partition", int)  # 0 to 1,073,741,823
Timestamp = NewType("Timestamp", int)  # 0 to 281,474,976,710,655
Pfid = NewType("Pfid", str)  # 32 character Crockford Base32 string

# Constants
MAX_TIMESTAMP = 281_474_976_710_655  # 2^48 - 1
MAX_PARTITION = 1_073_741_823  # 2^30 - 1

# Crockford Base32 encoding/decoding
ENCODE_CHARS = "0123456789abcdefghjkmnpqrstvwxyz"
DECODE_MAP: dict[str, int] = {
    "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
    "8": 8, "9": 9, "a": 10, "b": 11, "c": 12, "d": 13, "e": 14, "f": 15,
    "g": 16, "h": 17, "j": 18, "k": 19, "m": 20, "n": 21, "p": 22, "q": 23,
    "r": 24, "s": 25, "t": 26, "v": 27, "w": 28, "x": 29, "y": 30, "z": 31,
}

# Precompiled regex for validation
_VALID_PFID_PATTERN = re.compile(r"^[0-7][0-9abcdefghjkmnpqrstvwxyz]{31}$")


def _encode_char(value: int) -> str:
    """Encode a 5-bit value to a Crockford Base32 character."""
    return ENCODE_CHARS[value]


def _decode_char(char: str) -> int:
    """Decode a Crockford Base32 character to its 5-bit value."""
    value = DECODE_MAP.get(char.lower())
    if value is None:
        raise ValueError(f"Invalid character: {char}")
    return value


def _is_valid_timestamp(timestamp: int) -> bool:
    """Check if a timestamp is valid."""
    return isinstance(timestamp, int) and 0 <= timestamp <= MAX_TIMESTAMP


def _is_valid_partition(partition: int) -> bool:
    """Check if a partition is valid."""
    return isinstance(partition, int) and 0 <= partition <= MAX_PARTITION


def zero() -> Pfid:
    """Return a zero PFID.

    Probably don't actually use it, but if you need a placeholder.
    """
    return Pfid("00000000000000000000000000000000")


def generate(partition: Partition) -> Pfid:
    """Generate a Crockford Base32 encoded PFID string with current time."""
    if not _is_valid_partition(partition):
        raise ValueError(f"Invalid partition: {partition}")
    return _unsafe_encode(generate_binary(partition))


def generate_with_timestamp(partition: Partition, timestamp: Timestamp) -> Pfid:
    """Generate a Crockford Base32 encoded PFID string with a provided Unix timestamp."""
    if not _is_valid_partition(partition):
        raise ValueError(f"Invalid partition: {partition}")
    if not _is_valid_timestamp(timestamp):
        raise ValueError(f"Invalid timestamp: {timestamp}")
    return _unsafe_encode(generate_binary_with_timestamp(partition, timestamp))


def generate_example() -> Pfid:
    """Generate an ID suitable for use in an example -- it's well into the past."""
    return generate_with_timestamp(Partition(123_456_789), Timestamp(1_234_567_890_000))


def generate_related(existing_pfid: Pfid) -> Pfid:
    """Generate an ID with the same partition as an existing PFID."""
    return generate(extract_partition(existing_pfid))


def generate_root() -> Pfid:
    """Generate an ID with a random partition."""
    return generate(generate_partition())


def generate_binary(partition: Partition) -> BinaryPfid:
    """Generate a binary PFID with current time."""
    if not _is_valid_partition(partition):
        raise ValueError(f"Invalid partition: {partition}")
    timestamp = int(time.time() * 1000)
    return generate_binary_with_timestamp(partition, Timestamp(timestamp))


def generate_binary_with_timestamp(partition: Partition, timestamp: Timestamp) -> BinaryPfid:
    """Generate a binary PFID with a provided Unix timestamp.

    Binary layout (20 bytes):
    - Bytes 0-5: timestamp (48 bits, big-endian)
    - Bytes 6-9: partition (32 bits, big-endian, but only 30 bits used)
    - Bytes 10-19: randomness (80 bits)
    """
    if not _is_valid_partition(partition):
        raise ValueError(f"Invalid partition: {partition}")
    if not _is_valid_timestamp(timestamp):
        raise ValueError(f"Invalid timestamp: {timestamp}")

    buffer = bytearray(20)

    # Write timestamp (48 bits = 6 bytes) - big endian
    buffer[0] = (timestamp >> 40) & 0xFF
    buffer[1] = (timestamp >> 32) & 0xFF
    buffer[2] = (timestamp >> 24) & 0xFF
    buffer[3] = (timestamp >> 16) & 0xFF
    buffer[4] = (timestamp >> 8) & 0xFF
    buffer[5] = timestamp & 0xFF

    # Write partition (32 bits = 4 bytes) - big endian
    buffer[6] = (partition >> 24) & 0xFF
    buffer[7] = (partition >> 16) & 0xFF
    buffer[8] = (partition >> 8) & 0xFF
    buffer[9] = partition & 0xFF

    # Write randomness (80 bits = 10 bytes)
    random_bytes = secrets.token_bytes(10)
    buffer[10:20] = random_bytes

    return BinaryPfid(bytes(buffer))


def is_pfid(value: object) -> bool:
    """Check if a value is a valid PFID.

    Valid PFID: 32 characters, first character must be 0-7,
    rest must be valid Crockford Base32.
    """
    if not isinstance(value, str):
        return False

    if len(value) != 32:
        return False

    return bool(_VALID_PFID_PATTERN.match(value))


def encode(binary: BinaryPfid) -> Pfid:
    """Encode a binary PFID to a Crockford Base32 string.

    Raises:
        PfidError: If the binary is invalid
    """
    if not isinstance(binary, bytes) or len(binary) != 20:
        raise PfidError.make(PfidErrorCode.INVALID_BINARY, binary)

    try:
        encoded = _unsafe_encode(binary)
        if is_pfid(encoded):
            return encoded
        else:
            raise PfidError.make(PfidErrorCode.INVALID_BINARY, binary)
    except PfidError:
        raise
    except Exception:
        raise PfidError.make(PfidErrorCode.INVALID_BINARY, binary) from None


def decode(pfid: str) -> BinaryPfid:
    """Decode a Crockford Base32 PFID string to binary.

    Raises:
        PfidError: If the PFID is invalid
    """
    if not isinstance(pfid, str) or len(pfid) != 32:
        raise PfidError.make(PfidErrorCode.INVALID_PFID, pfid)

    # First character must be 0-7
    if pfid[0] < "0" or pfid[0] > "7":
        raise PfidError.make(PfidErrorCode.INVALID_PFID, pfid)

    try:
        return _unsafe_decode(pfid)
    except PfidError:
        raise
    except Exception:
        raise PfidError.make(PfidErrorCode.INVALID_PFID, pfid) from None


def extract_partition(pfid: str) -> Partition:
    """Extract partition from a PFID string.

    Raises:
        PfidError: If the PFID is invalid
    """
    if not is_pfid(pfid):
        raise PfidError.make(PfidErrorCode.INVALID_PFID, pfid)

    try:
        # Extract the partition portion (characters 10-15, 6 characters = 30 bits)
        partition_str = pfid[10:16]
        return _decode_partition(partition_str)
    except PfidError:
        raise
    except Exception:
        raise PfidError.make(PfidErrorCode.INVALID_PFID, pfid) from None


def generate_partition() -> Partition:
    """Generate a random partition."""
    random_bytes = secrets.token_bytes(4)
    # Clear top 2 bits to ensure partition is in valid range
    first_byte = random_bytes[0] & 0x3F  # Keep only bottom 6 bits
    partition = (
        (first_byte << 24)
        | (random_bytes[1] << 16)
        | (random_bytes[2] << 8)
        | random_bytes[3]
    ) & 0x3FFFFFFF
    return Partition(partition)


# Internal encoding/decoding functions


def _unsafe_encode(binary: bytes) -> Pfid:
    """Unsafe encode - assumes valid 20-byte buffer.

    Encodes 160 bits as 32 characters of Crockford Base32.

    Bit layout (reading from binary):
    - t1::3, t2::5, t3::5, t4::5, t5::5, t6::5, t7::5, t8::5, t9::5, t10::5 (48 bits timestamp)
    - 0::2 (2 bits padding)
    - p1::5, p2::5, p3::5, p4::5, p5::5, p6::5 (30 bits partition)
    - r1::5 ... r16::5 (80 bits randomness)
    """
    bit_offset = 0

    def read_bits(count: int) -> int:
        nonlocal bit_offset
        value = 0
        for _ in range(count):
            byte_index = bit_offset // 8
            bit_index = 7 - (bit_offset % 8)
            bit = (binary[byte_index] >> bit_index) & 1
            value = (value << 1) | bit
            bit_offset += 1
        return value

    # Read timestamp: 3 + 5*9 = 48 bits
    t1 = read_bits(3)
    t2 = read_bits(5)
    t3 = read_bits(5)
    t4 = read_bits(5)
    t5 = read_bits(5)
    t6 = read_bits(5)
    t7 = read_bits(5)
    t8 = read_bits(5)
    t9 = read_bits(5)
    t10 = read_bits(5)

    # Skip 2 padding bits
    read_bits(2)

    # Read partition: 5*6 = 30 bits
    p1 = read_bits(5)
    p2 = read_bits(5)
    p3 = read_bits(5)
    p4 = read_bits(5)
    p5 = read_bits(5)
    p6 = read_bits(5)

    # Read randomness: 5*16 = 80 bits
    r_values = [read_bits(5) for _ in range(16)]

    # Build the encoded string
    timestamp_chars = "".join(_encode_char(t) for t in [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10])
    partition_chars = "".join(_encode_char(p) for p in [p1, p2, p3, p4, p5, p6])
    random_chars = "".join(_encode_char(r) for r in r_values)

    return Pfid(timestamp_chars + partition_chars + random_chars)


def _unsafe_decode(pfid: str) -> BinaryPfid:
    """Unsafe decode - assumes valid 32-character string.

    Decodes 32 characters of Crockford Base32 to 160 bits (20 bytes).
    """
    # Decode each character to its 5-bit value (except t1 which is 3 bits)
    t1 = _decode_char(pfid[0])   # 3 bits
    t2 = _decode_char(pfid[1])   # 5 bits
    t3 = _decode_char(pfid[2])   # 5 bits
    t4 = _decode_char(pfid[3])   # 5 bits
    t5 = _decode_char(pfid[4])   # 5 bits
    t6 = _decode_char(pfid[5])   # 5 bits
    t7 = _decode_char(pfid[6])   # 5 bits
    t8 = _decode_char(pfid[7])   # 5 bits
    t9 = _decode_char(pfid[8])   # 5 bits
    t10 = _decode_char(pfid[9])  # 5 bits

    p1 = _decode_char(pfid[10])  # 5 bits
    p2 = _decode_char(pfid[11])  # 5 bits
    p3 = _decode_char(pfid[12])  # 5 bits
    p4 = _decode_char(pfid[13])  # 5 bits
    p5 = _decode_char(pfid[14])  # 5 bits
    p6 = _decode_char(pfid[15])  # 5 bits

    r_values = [_decode_char(pfid[16 + i]) for i in range(16)]

    # Helper to write bits across byte boundaries
    buffer = bytearray(20)
    bit_offset = 0

    def write_bits(value: int, count: int) -> None:
        nonlocal bit_offset
        for i in range(count - 1, -1, -1):
            byte_index = bit_offset // 8
            bit_index = 7 - (bit_offset % 8)
            bit = (value >> i) & 1
            buffer[byte_index] |= bit << bit_index
            bit_offset += 1

    # Write timestamp: 3 + 5*9 = 48 bits
    write_bits(t1, 3)
    write_bits(t2, 5)
    write_bits(t3, 5)
    write_bits(t4, 5)
    write_bits(t5, 5)
    write_bits(t6, 5)
    write_bits(t7, 5)
    write_bits(t8, 5)
    write_bits(t9, 5)
    write_bits(t10, 5)

    # Write 2 padding bits (0)
    write_bits(0, 2)

    # Write partition: 5*6 = 30 bits
    write_bits(p1, 5)
    write_bits(p2, 5)
    write_bits(p3, 5)
    write_bits(p4, 5)
    write_bits(p5, 5)
    write_bits(p6, 5)

    # Write randomness: 5*16 = 80 bits
    for r in r_values:
        write_bits(r, 5)

    return BinaryPfid(bytes(buffer))


def _decode_partition(partition_str: str) -> Partition:
    """Decode partition from 6-character encoded partition string.

    Raises:
        PfidError: If the partition string is invalid
    """
    if not isinstance(partition_str, str) or len(partition_str) != 6:
        raise PfidError.make(PfidErrorCode.INVALID_PARTITION, partition_str)

    try:
        p1 = _decode_char(partition_str[0])
        p2 = _decode_char(partition_str[1])
        p3 = _decode_char(partition_str[2])
        p4 = _decode_char(partition_str[3])
        p5 = _decode_char(partition_str[4])
        p6 = _decode_char(partition_str[5])

        # Reconstruct the 30-bit partition value
        # The partition is stored as: 0 (2 bits) + p1 (5 bits) + p2 (5 bits) + ... + p6 (5 bits)
        buffer = bytearray(4)
        buffer[0] = (0 << 6) | (p1 << 1) | (p2 >> 4)
        buffer[1] = ((p2 & 0x0F) << 4) | (p3 >> 1)
        buffer[2] = ((p3 & 0x01) << 7) | (p4 << 2) | (p5 >> 3)
        buffer[3] = ((p5 & 0x07) << 5) | (p6 >> 0)

        # Read as 32-bit unsigned integer, mask to 30 bits
        partition = (
            (buffer[0] << 24) | (buffer[1] << 16) | (buffer[2] << 8) | buffer[3]
        ) & 0x3FFFFFFF
        return Partition(partition)
    except PfidError:
        raise
    except Exception:
        raise PfidError.make(PfidErrorCode.INVALID_PARTITION, partition_str) from None
