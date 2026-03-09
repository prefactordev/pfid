# Pfid

PFID - A ULID-like identifier with partition support.

## Installation

Add `pfid` to your list of dependencies in `mix.exs`:

```elixir
def deps do
  [
    {:pfid, "~> 1.0.0"}
  ]
end
```

## Usage

```elixir
# Generate a PFID with a partition
Pfid.generate(123_456_789)

# Generate with a specific timestamp
Pfid.generate(123_456_789, 1_234_567_890_000)

# Generate with a random partition (root ID)
Pfid.generate_root()

# Generate related to an existing PFID (same partition)
Pfid.generate_related(existing_pfid)

# Extract partition from a PFID
Pfid.extract_partition!(pfid_string)
```

## Format

- 48 bits for timestamp (milliseconds since Unix epoch)
- 30 bits for partition (up to 1,073,741,824 partitions)
- 80 bits for randomness
- Encoded as 32 characters using Crockford Base32

## License

MIT License - See [LICENSE](LICENSE) for details.
