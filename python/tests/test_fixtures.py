"""Tests using the shared fixtures file."""

from pathlib import Path

from pfid import decode, encode, extract_partition, is_pfid

FIXTURES_PATH = Path(__file__).parent.parent.parent / "fixtures" / "pfid_fixtures.csv"


def validate_fixture(line: str) -> None:
    """Validate a single fixture line."""
    timestamp_str, partition_str, randomness_hex, expected_pfid = line.split(",")

    timestamp = int(timestamp_str)
    partition = int(partition_str)
    randomness = bytes.fromhex(randomness_hex)

    # Construct binary PFID
    # Layout: 48 bits timestamp + 32 bits partition + 80 bits randomness
    binary = bytearray(20)

    # Write timestamp (48 bits = 6 bytes) - big endian
    binary[0] = (timestamp >> 40) & 0xFF
    binary[1] = (timestamp >> 32) & 0xFF
    binary[2] = (timestamp >> 24) & 0xFF
    binary[3] = (timestamp >> 16) & 0xFF
    binary[4] = (timestamp >> 8) & 0xFF
    binary[5] = timestamp & 0xFF

    # Write partition (32 bits = 4 bytes) - big endian
    binary[6] = (partition >> 24) & 0xFF
    binary[7] = (partition >> 16) & 0xFF
    binary[8] = (partition >> 8) & 0xFF
    binary[9] = partition & 0xFF

    # Write randomness (80 bits = 10 bytes)
    binary[10:20] = randomness

    binary_bytes = bytes(binary)

    # Test encoding
    encoded = encode(binary_bytes)  # type: ignore[arg-type]
    assert encoded == expected_pfid, (
        f"Encoded PFID does not match expected value. "
        f"Got: {encoded}, Expected: {expected_pfid}"
    )

    # Test decoding
    decoded = decode(expected_pfid)
    assert decoded == binary_bytes, "Decoded binary does not match original"

    # Test partition extraction
    extracted_partition = extract_partition(expected_pfid)
    assert extracted_partition == partition, (
        f"Extracted partition does not match expected value. "
        f"Got: {extracted_partition}, Expected: {partition}"
    )

    # Test is_pfid
    assert is_pfid(expected_pfid), "is_pfid should return True for valid PFID"


class TestFixturesValidation:
    """Tests that validate against the shared fixtures file."""

    def test_all_fixtures_are_valid(self) -> None:
        """Validate all fixtures in the CSV file."""
        fixtures_content = FIXTURES_PATH.read_text()
        lines = fixtures_content.split("\n")

        # Skip header line
        data_lines = lines[1:]

        for line in data_lines:
            trimmed_line = line.strip()
            if trimmed_line:
                validate_fixture(trimmed_line)

    def test_fixtures_file_exists(self) -> None:
        """Ensure the fixtures file exists."""
        assert FIXTURES_PATH.exists(), f"Fixtures file not found at {FIXTURES_PATH}"

    def test_fixtures_file_has_content(self) -> None:
        """Ensure the fixtures file has meaningful content."""
        fixtures_content = FIXTURES_PATH.read_text()
        lines = [line.strip() for line in fixtures_content.split("\n") if line.strip()]
        # Should have header + at least some data
        assert len(lines) > 1, "Fixtures file should have header + data"
