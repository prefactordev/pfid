defmodule PfidFixturesTest do
  use ExUnit.Case, async: true

  alias Pfid

  @fixtures_path Path.join([__DIR__, "..", "..", "fixtures", "pfid_fixtures.csv"])

  describe "fixtures validation" do
    test "all fixtures are valid" do
      unless File.exists?(@fixtures_path) do
        flunk("Fixtures file not found at #{@fixtures_path}. Run 'mix generate_fixtures' first.")
      end

      @fixtures_path
      |> File.stream!()
      |> Stream.drop(1)
      |> Enum.each(fn line ->
        line = String.trim(line)

        if line != "" do
          validate_fixture(line)
        end
      end)
    end
  end

  defp validate_fixture(line) do
    [timestamp_str, partition_str, randomness_hex, expected_pfid] =
      String.split(line, ",", trim: true)

    timestamp = String.to_integer(timestamp_str)
    partition = String.to_integer(partition_str)
    randomness = Base.decode16!(randomness_hex, case: :lower)

    # Construct binary PFID
    binary =
      <<timestamp::unsigned-size(48), partition::unsigned-size(32), randomness::binary-size(10)>>

    # Test encoding
    {:ok, encoded_pfid} = Pfid.encode(binary)
    assert encoded_pfid == expected_pfid, "Encoded PFID does not match expected value"

    # Test decoding
    {:ok, decoded_binary} = Pfid.decode(expected_pfid)
    assert decoded_binary == binary, "Decoded binary does not match original"

    # Test partition extraction
    extracted_partition = Pfid.extract_partition!(expected_pfid)
    assert extracted_partition == partition, "Extracted partition does not match expected value"

    # Test is_pfid?
    assert Pfid.is_pfid?(expected_pfid) == true, "is_pfid? should return true for valid PFID"
  end
end
