defmodule Pfid.MixProject do
  use Mix.Project

  @source_url "https://github.com/prefactordev/pfid"

  def project do
    [
      app: :pfid,
      version: "1.0.0",
      elixir: "~> 1.15",
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      description: description(),
      package: package(),
      docs: docs(),
      test_coverage: [ignore_modules: [Mix.Tasks.GenerateFixtures]]
    ]
  end

  def application do
    [
      extra_applications: [:logger, :crypto]
    ]
  end

  defp deps do
    [
      {:ex_doc, ">= 0.0.0", only: :dev, runtime: false}
    ]
  end

  defp description do
    "PFID - A ULID-like identifier with partition support"
  end

  defp package do
    [
      licenses: ["MIT"],
      links: %{"GitHub" => @source_url},
      files: ~w(lib mix.exs README.md LICENSE)
    ]
  end

  defp docs do
    [
      main: "readme",
      extras: ["README.md", "LICENSE"],
      source_url: @source_url,
      source_url_pattern: "#{@source_url}/blob/main/elixir/%{path}#L%{line}"
    ]
  end
end
