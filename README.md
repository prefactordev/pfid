# PFID Monorepo

This is a monorepo containing implementations of PFID in different programming languages.

PFID is a ULID-like identifier format with partition support. It consists of:
- 48 bits for timestamp (milliseconds since Unix epoch)
- 30 bits for partition (allows up to 1,073,741,824 partitions)
- 80 bits for randomness
- Encoded as 32 characters using Crockford Base32

## Structure

- `elixir/` - Elixir implementation
- `python/` - Python implementation
- `typescript/` - TypeScript implementation

## Development Setup

This project uses [mise](https://mise.jdx.dev/) for managing development environments.

### Initial Setup

1. Install mise (if not already installed):
   ```bash
   curl https://mise.run | sh
   ```

2. Install tools:
   ```bash
   mise install
   ```

3. Activate the environment:
   ```bash
   mise activate
   ```

### Elixir Development

Navigate to the elixir directory:
```bash
cd elixir
```

Install dependencies:
```bash
mise run elixir:deps
```

Run tests:
```bash
mise run elixir:test
```

Start an IEx console:
```bash
mise run elixir:console
```

Format code:
```bash
mise run elixir:format
```

Regenerate fixtures:
```bash
mise run regenerate_fixtures
```

### TypeScript Development

Navigate to the typescript directory:
```bash
cd typescript
```

Install dependencies:
```bash
mise run typescript:deps
```

Run tests:
```bash
mise run typescript:test
```

Type check:
```bash
mise run typescript:typecheck
```

Build:
```bash
mise run typescript:build
```

### Python Development

Install dependencies:
```bash
mise run python:deps
```

Run tests:
```bash
mise run python:test
```

Type check:
```bash
mise run python:typecheck
```

Lint:
```bash
mise run python:lint
```

## License

MIT License - See individual implementation files for details.
