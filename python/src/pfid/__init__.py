"""PFID - A ULID-like identifier format with partition support."""

from pfid.errors import PfidError, PfidErrorCode
from pfid.pfid import (
    BinaryPfid,
    Partition,
    Pfid,
    Timestamp,
    decode,
    encode,
    extract_partition,
    generate,
    generate_binary,
    generate_binary_with_timestamp,
    generate_example,
    generate_partition,
    generate_related,
    generate_root,
    generate_with_timestamp,
    is_pfid,
    zero,
)

__all__ = [
    # Types
    "BinaryPfid",
    "Partition",
    "Pfid",
    "Timestamp",
    # Functions
    "decode",
    "encode",
    "extract_partition",
    "generate",
    "generate_binary",
    "generate_binary_with_timestamp",
    "generate_example",
    "generate_partition",
    "generate_related",
    "generate_root",
    "generate_with_timestamp",
    "is_pfid",
    "zero",
    # Errors
    "PfidError",
    "PfidErrorCode",
]
