"""Custom exceptions for PFID."""

from enum import Enum
from typing import Any


class PfidErrorCode(Enum):
    """Error codes for PFID operations."""

    INVALID_BINARY = "invalid_binary"
    INVALID_PFID = "invalid_pfid"
    INVALID_PARTITION = "invalid_partition"


class PfidError(Exception):
    """Exception raised for PFID-related errors."""

    def __init__(self, code: PfidErrorCode, message: str) -> None:
        super().__init__(message)
        self.code = code

    @classmethod
    def make(cls, code: PfidErrorCode, problem: Any) -> "PfidError":
        """Create a PfidError with a formatted message."""
        match code:
            case PfidErrorCode.INVALID_BINARY:
                message = f"invalid binary PFID: {problem!r}"
            case PfidErrorCode.INVALID_PFID:
                message = f"invalid PFID: {problem!r}"
            case PfidErrorCode.INVALID_PARTITION:
                message = f"invalid partition: {problem!r}"
        return cls(code, message)
