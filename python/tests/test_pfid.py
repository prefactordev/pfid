"""Tests for PFID functionality."""

import pytest

from pfid import (
    PfidError,
    PfidErrorCode,
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


class TestZero:
    """Tests for the zero function."""

    def test_returns_a_zero_pfid(self) -> None:
        assert zero() == "00000000000000000000000000000000"


class TestGenerate:
    """Tests for the generate function."""

    def test_generates_a_valid_pfid_with_partition(self) -> None:
        partition = 123_456_789
        pfid = generate(partition)

        assert is_pfid(pfid) is True
        assert extract_partition(pfid) == partition

    def test_generates_unique_pfids(self) -> None:
        partition = 1
        pfid1 = generate(partition)
        pfid2 = generate(partition)

        assert pfid1 != pfid2
        assert is_pfid(pfid1) is True
        assert is_pfid(pfid2) is True

    def test_throws_on_invalid_partition(self) -> None:
        with pytest.raises(ValueError):
            generate(-1)
        with pytest.raises(ValueError):
            generate(1_073_741_824)


class TestGenerateWithTimestamp:
    """Tests for the generate_with_timestamp function."""

    def test_generates_a_pfid_with_partition_and_timestamp(self) -> None:
        partition = 123_456_789
        timestamp = 1_234_567_890_000
        pfid = generate_with_timestamp(partition, timestamp)

        assert is_pfid(pfid) is True
        assert extract_partition(pfid) == partition

    def test_throws_on_invalid_timestamp(self) -> None:
        with pytest.raises(ValueError):
            generate_with_timestamp(1, -1)
        with pytest.raises(ValueError):
            generate_with_timestamp(1, 281_474_976_710_656)


class TestGenerateExample:
    """Tests for the generate_example function."""

    def test_generates_an_example_pfid(self) -> None:
        pfid = generate_example()

        assert is_pfid(pfid) is True
        assert extract_partition(pfid) == 123_456_789


class TestGenerateRelated:
    """Tests for the generate_related function."""

    def test_generates_a_pfid_with_the_same_partition(self) -> None:
        original_pfid = generate(123_456_789)
        related_pfid = generate_related(original_pfid)

        assert is_pfid(related_pfid) is True
        assert extract_partition(related_pfid) == extract_partition(original_pfid)


class TestGenerateRoot:
    """Tests for the generate_root function."""

    def test_generates_a_pfid_with_random_partition(self) -> None:
        pfid = generate_root()

        assert is_pfid(pfid) is True
        partition = extract_partition(pfid)
        assert 0 <= partition < 1_073_741_824


class TestGenerateBinary:
    """Tests for the generate_binary function."""

    def test_generates_a_binary_pfid(self) -> None:
        partition = 123_456_789
        binary = generate_binary(partition)

        assert len(binary) == 20
        encoded = encode(binary)
        assert is_pfid(encoded) is True


class TestGenerateBinaryWithTimestamp:
    """Tests for the generate_binary_with_timestamp function."""

    def test_generates_a_binary_pfid_with_timestamp(self) -> None:
        partition = 123_456_789
        timestamp = 1_234_567_890_000
        binary = generate_binary_with_timestamp(partition, timestamp)

        assert len(binary) == 20
        encoded = encode(binary)
        assert is_pfid(encoded) is True


class TestIsPfid:
    """Tests for the is_pfid function."""

    def test_returns_true_for_valid_pfid(self) -> None:
        pfid = generate(1)
        assert is_pfid(pfid) is True

    def test_returns_false_for_invalid_strings(self) -> None:
        assert is_pfid("invalid") is False
        assert is_pfid("") is False
        assert is_pfid("01an4z07byd9df0k79ka1307sr9x4mv") is False  # 31 chars

    def test_returns_false_for_non_strings(self) -> None:
        assert is_pfid(123) is False  # type: ignore[arg-type]
        assert is_pfid(None) is False  # type: ignore[arg-type]
        assert is_pfid({}) is False  # type: ignore[arg-type]

    def test_returns_false_for_strings_starting_with_8_or_9(self) -> None:
        assert is_pfid("8" + "0" * 31) is False
        assert is_pfid("9" + "0" * 31) is False


class TestEncode:
    """Tests for the encode function."""

    def test_encodes_a_valid_binary(self) -> None:
        partition = 123_456_789
        binary = generate_binary(partition)
        encoded = encode(binary)

        assert is_pfid(encoded) is True
        assert extract_partition(encoded) == partition

    def test_throws_error_for_invalid_binary_size(self) -> None:
        with pytest.raises(PfidError) as exc_info:
            encode(bytes([1, 2, 3]))  # type: ignore[arg-type]
        assert exc_info.value.code == PfidErrorCode.INVALID_BINARY
        assert "invalid binary" in str(exc_info.value)

    def test_throws_error_for_non_binary(self) -> None:
        with pytest.raises(PfidError) as exc_info:
            encode("not binary")  # type: ignore[arg-type]
        assert exc_info.value.code == PfidErrorCode.INVALID_BINARY

        with pytest.raises(PfidError) as exc_info:
            encode(123)  # type: ignore[arg-type]
        assert exc_info.value.code == PfidErrorCode.INVALID_BINARY


class TestDecode:
    """Tests for the decode function."""

    def test_decodes_a_valid_pfid(self) -> None:
        partition = 123_456_789
        pfid = generate(partition)
        binary = decode(pfid)

        assert len(binary) == 20
        encoded = encode(binary)
        assert encoded == pfid

    def test_throws_error_for_invalid_pfid(self) -> None:
        with pytest.raises(PfidError) as exc_info:
            decode("invalid")
        assert exc_info.value.code == PfidErrorCode.INVALID_PFID
        assert "invalid PFID" in str(exc_info.value)

        with pytest.raises(PfidError) as exc_info:
            decode("")
        assert exc_info.value.code == PfidErrorCode.INVALID_PFID

    def test_throws_error_for_non_string(self) -> None:
        with pytest.raises(PfidError) as exc_info:
            decode(123)  # type: ignore[arg-type]
        assert exc_info.value.code == PfidErrorCode.INVALID_PFID


class TestExtractPartition:
    """Tests for the extract_partition function."""

    def test_extracts_partition_from_valid_pfid(self) -> None:
        partition = 123_456_789
        pfid = generate(partition)
        extracted = extract_partition(pfid)

        assert extracted == partition

    def test_throws_error_for_invalid_pfid(self) -> None:
        with pytest.raises(PfidError) as exc_info:
            extract_partition("invalid")
        assert exc_info.value.code == PfidErrorCode.INVALID_PFID
        assert "invalid PFID" in str(exc_info.value)


class TestGeneratePartition:
    """Tests for the generate_partition function."""

    def test_generates_a_valid_partition(self) -> None:
        partition = generate_partition()

        assert 0 <= partition < 1_073_741_824

    def test_generates_different_partitions(self) -> None:
        partitions: list[int] = []
        for _ in range(10):
            partitions.append(generate_partition())
        unique_partitions = set(partitions)

        # Very unlikely to have duplicates, but possible
        assert len(unique_partitions) >= 8


class TestRoundTripEncodingDecoding:
    """Tests for round-trip encoding/decoding."""

    def test_encode_and_decode_are_inverse_operations(self) -> None:
        partition = 123_456_789
        pfid = generate(partition)

        binary = decode(pfid)
        encoded = encode(binary)
        assert encoded == pfid

    def test_binary_encode_and_decode_are_inverse_operations(self) -> None:
        partition = 123_456_789
        binary = generate_binary(partition)

        encoded = encode(binary)
        decoded = decode(encoded)
        assert decoded == binary


class TestPartitionConsistency:
    """Tests for partition consistency."""

    def test_all_generated_pfids_with_same_partition_have_same_partition(self) -> None:
        partition = 123_456_789

        pfids: list[str] = []
        for _ in range(10):
            pfids.append(generate(partition))

        partitions = [extract_partition(pfid) for pfid in pfids]

        assert all(p == partition for p in partitions)
