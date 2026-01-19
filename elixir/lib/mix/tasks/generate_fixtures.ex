defmodule Mix.Tasks.GenerateFixtures do
  @moduledoc """
  Generates a CSV file with PFID test fixtures for cross-implementation testing.
  """
  use Mix.Task

  @shortdoc "Generates PFID fixtures CSV file"
  @requirements ["app.config"]

  @max_timestamp 281_474_976_710_655
  @max_partition 1_073_741_823

  def run(args) do
    output_path =
      case args do
        [path] -> path
        [] -> Path.join([File.cwd!(), "..", "fixtures", "pfid_fixtures.csv"])
        _ -> Mix.raise("Usage: mix generate_fixtures [path]")
      end

    fixtures_dir = Path.dirname(output_path)
    File.mkdir_p!(fixtures_dir)

    test_cases = generate_test_cases()

    File.write!(output_path, csv_header())

    test_cases
    |> Enum.each(fn {timestamp, partition, randomness} ->
      binary =
        <<timestamp::unsigned-size(48), partition::unsigned-size(32),
          randomness::binary-size(10)>>

      {:ok, pfid} = Pfid.encode(binary)
      randomness_hex = Base.encode16(randomness, case: :lower)
      csv_row = "#{timestamp},#{partition},#{randomness_hex},#{pfid}\n"
      File.write!(output_path, csv_row, [:append])
    end)

    count = length(test_cases)
    IO.puts("Generated #{count} test fixtures in #{output_path}")
  end

  defp csv_header do
    "timestamp,partition,randomness_hex,pfid\n"
  end

  defp generate_test_cases do
    edge_cases() ++ random_cases()
  end

  defp edge_cases do
    # Zero values
    zero_randomness = <<0, 0, 0, 0, 0, 0, 0, 0, 0, 0>>

    [
      # Zero timestamp, zero partition, zero randomness
      {0, 0, zero_randomness},
      # Zero timestamp, zero partition, max randomness
      {0, 0, max_randomness()},
      # Zero timestamp, max partition, zero randomness
      {0, @max_partition, zero_randomness},
      # Zero timestamp, max partition, max randomness
      {0, @max_partition, max_randomness()},
      # Max timestamp, zero partition, zero randomness
      {@max_timestamp, 0, zero_randomness},
      # Max timestamp, zero partition, max randomness
      {@max_timestamp, 0, max_randomness()},
      # Max timestamp, max partition, zero randomness
      {@max_timestamp, @max_partition, zero_randomness},
      # Max timestamp, max partition, max randomness
      {@max_timestamp, @max_partition, max_randomness()},
      # Boundary values
      {1, 1, zero_randomness},
      {1, 1, max_randomness()},
      {1, @max_partition - 1, zero_randomness},
      {@max_timestamp - 1, 1, zero_randomness},
      # Various partition values
      {0, 1, zero_randomness},
      {0, 100, zero_randomness},
      {0, 1_000, zero_randomness},
      {0, 10_000, zero_randomness},
      {0, 100_000, zero_randomness},
      {0, 1_000_000, zero_randomness},
      {0, 10_000_000, zero_randomness},
      {0, 100_000_000, zero_randomness},
      {0, 500_000_000, zero_randomness},
      {0, @max_partition, zero_randomness},
      # Various timestamp values
      {1, 0, zero_randomness},
      {1_000, 0, zero_randomness},
      {1_000_000, 0, zero_randomness},
      {1_000_000_000, 0, zero_randomness},
      {1_000_000_000_000, 0, zero_randomness},
      {1_234_567_890_000, 0, zero_randomness},
      {@max_timestamp - 1, 0, zero_randomness},
      # Example from the code
      {1_234_567_890_000, 123_456_789, zero_randomness},
      {1_234_567_890_000, 123_456_789, max_randomness()}
    ]
  end

  defp random_cases do
    # Use a fixed seed for reproducibility
    :rand.seed(:exsplus, {1, 2, 3})

    for _ <- 1..200 do
      timestamp = :rand.uniform(@max_timestamp + 1) - 1
      partition = :rand.uniform(@max_partition + 1) - 1
      randomness = :crypto.strong_rand_bytes(10)
      {timestamp, partition, randomness}
    end
  end

  defp max_randomness do
    <<0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF>>
  end
end
