defmodule PfidTest do
  use ExUnit.Case, async: true

  alias Pfid
  alias Pfid.PfidError

  describe "zero/0" do
    test "returns a zero PFID" do
      assert Pfid.zero() == "00000000000000000000000000000000"
    end
  end

  describe "generate/1" do
    test "generates a valid PFID with partition" do
      partition = 123_456_789
      pfid = Pfid.generate(partition)

      assert Pfid.is_pfid?(pfid)
      assert Pfid.extract_partition!(pfid) == partition
    end

    test "generates unique PFIDs" do
      partition = 1
      pfid1 = Pfid.generate(partition)
      pfid2 = Pfid.generate(partition)

      assert pfid1 != pfid2
      assert Pfid.is_pfid?(pfid1)
      assert Pfid.is_pfid?(pfid2)
    end

    test "raises on invalid partition" do
      assert_raise FunctionClauseError, fn ->
        Pfid.generate(-1)
      end

      assert_raise FunctionClauseError, fn ->
        Pfid.generate(1_073_741_824)
      end
    end
  end

  describe "generate/2" do
    test "generates a PFID with partition and timestamp" do
      partition = 123_456_789
      timestamp = 1_234_567_890_000
      pfid = Pfid.generate(partition, timestamp)

      assert Pfid.is_pfid?(pfid)
      assert Pfid.extract_partition!(pfid) == partition
    end

    test "raises on invalid timestamp" do
      assert_raise FunctionClauseError, fn ->
        Pfid.generate(1, -1)
      end

      assert_raise FunctionClauseError, fn ->
        Pfid.generate(1, 281_474_976_710_656)
      end
    end
  end

  describe "generate_example/0" do
    test "generates an example PFID" do
      pfid = Pfid.generate_example()

      assert Pfid.is_pfid?(pfid)
      assert Pfid.extract_partition!(pfid) == 123_456_789
    end
  end

  describe "generate_related/1" do
    test "generates a PFID with the same partition" do
      original_pfid = Pfid.generate(123_456_789)
      related_pfid = Pfid.generate_related(original_pfid)

      assert Pfid.is_pfid?(related_pfid)
      assert Pfid.extract_partition!(related_pfid) == Pfid.extract_partition!(original_pfid)
    end
  end

  describe "generate_root/0" do
    test "generates a PFID with random partition" do
      pfid = Pfid.generate_root()

      assert Pfid.is_pfid?(pfid)
      partition = Pfid.extract_partition!(pfid)
      assert partition >= 0
      assert partition < 1_073_741_824
    end
  end

  describe "generate_binary/1" do
    test "generates a binary PFID" do
      partition = 123_456_789
      binary = Pfid.generate_binary(partition)

      assert byte_size(binary) == 20
      {:ok, encoded} = Pfid.encode(binary)
      assert Pfid.is_pfid?(encoded)
    end
  end

  describe "generate_binary/2" do
    test "generates a binary PFID with timestamp" do
      partition = 123_456_789
      timestamp = 1_234_567_890_000
      binary = Pfid.generate_binary(partition, timestamp)

      assert byte_size(binary) == 20
      {:ok, encoded} = Pfid.encode(binary)
      assert Pfid.is_pfid?(encoded)
    end
  end

  describe "is_pfid?/1" do
    test "returns true for valid PFID" do
      pfid = Pfid.generate(1)
      assert Pfid.is_pfid?(pfid) == true
    end

    test "returns false for invalid strings" do
      assert Pfid.is_pfid?("invalid") == false
      assert Pfid.is_pfid?("") == false
      assert Pfid.is_pfid?("01an4z07byd9df0k79ka1307sr9x4mv") == false
    end

    test "returns false for non-strings" do
      assert Pfid.is_pfid?(123) == false
      assert Pfid.is_pfid?(nil) == false
      assert Pfid.is_pfid?(%{}) == false
    end

    test "returns false for strings starting with 8-9" do
      assert Pfid.is_pfid?("8" <> String.duplicate("0", 31)) == false
      assert Pfid.is_pfid?("9" <> String.duplicate("0", 31)) == false
    end
  end

  describe "encode/1" do
    test "encodes a valid binary" do
      partition = 123_456_789
      binary = Pfid.generate_binary(partition)
      {:ok, encoded} = Pfid.encode(binary)

      assert Pfid.is_pfid?(encoded)
      assert Pfid.extract_partition!(encoded) == partition
    end

    test "returns error for invalid binary size" do
      {:error, %PfidError{code: :invalid_binary}} = Pfid.encode(<<1, 2, 3>>)
    end

    test "returns error for non-binary" do
      {:error, %PfidError{code: :invalid_binary}} = Pfid.encode("not binary")
      {:error, %PfidError{code: :invalid_binary}} = Pfid.encode(123)
    end
  end

  describe "decode/1" do
    test "decodes a valid PFID" do
      partition = 123_456_789
      pfid = Pfid.generate(partition)
      {:ok, binary} = Pfid.decode(pfid)

      assert byte_size(binary) == 20
      {:ok, encoded} = Pfid.encode(binary)
      assert encoded == pfid
    end

    test "returns error for invalid PFID" do
      {:error, %PfidError{code: :invalid_pfid}} = Pfid.decode("invalid")
      {:error, %PfidError{code: :invalid_pfid}} = Pfid.decode("")
    end

    test "returns error for non-string" do
      {:error, %PfidError{code: :invalid_pfid}} = Pfid.decode(123)
    end
  end

  describe "extract_partition/1" do
    test "extracts partition from valid PFID" do
      partition = 123_456_789
      pfid = Pfid.generate(partition)
      {:ok, extracted} = Pfid.extract_partition(pfid)

      assert extracted == partition
    end

    test "returns error for invalid PFID" do
      {:error, %PfidError{code: :invalid_pfid}} = Pfid.extract_partition("invalid")
    end
  end

  describe "extract_partition!/1" do
    test "extracts partition from valid PFID" do
      partition = 123_456_789
      pfid = Pfid.generate(partition)

      assert Pfid.extract_partition!(pfid) == partition
    end

    test "raises on invalid PFID" do
      assert_raise PfidError, fn ->
        Pfid.extract_partition!("invalid")
      end
    end
  end

  describe "generate_partition/0" do
    test "generates a valid partition" do
      partition = Pfid.generate_partition()

      assert partition >= 0
      assert partition < 1_073_741_824
    end

    test "generates different partitions" do
      partitions = for _ <- 1..10, do: Pfid.generate_partition()
      unique_partitions = Enum.uniq(partitions)

      # Very unlikely to have duplicates, but possible
      assert length(unique_partitions) >= 8
    end
  end

  describe "round-trip encoding/decoding" do
    test "encode and decode are inverse operations" do
      partition = 123_456_789
      pfid = Pfid.generate(partition)

      {:ok, binary} = Pfid.decode(pfid)
      {:ok, encoded} = Pfid.encode(binary)

      assert encoded == pfid
    end

    test "binary encode and decode are inverse operations" do
      partition = 123_456_789
      binary = Pfid.generate_binary(partition)

      {:ok, encoded} = Pfid.encode(binary)
      {:ok, decoded} = Pfid.decode(encoded)

      assert decoded == binary
    end
  end

  describe "partition consistency" do
    test "all generated PFIDs with same partition have same partition" do
      partition = 123_456_789

      pfids =
        for _ <- 1..10 do
          Pfid.generate(partition)
        end

      partitions = Enum.map(pfids, &Pfid.extract_partition!/1)

      assert Enum.all?(partitions, fn p -> p == partition end)
    end
  end
end
