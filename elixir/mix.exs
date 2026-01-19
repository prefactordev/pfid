defmodule Pfid.MixProject do
  use Mix.Project

  def project do
    [
      app: :pfid,
      version: "0.1.0",
      elixir: "~> 1.15",
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      description: description(),
      package: package()
    ]
  end

  def application do
    [
      extra_applications: [:logger, :crypto]
    ]
  end

  defp deps do
    []
  end

  defp description do
    "PFID - A ULID-like identifier with partition support"
  end

  defp package do
    [
      licenses: ["MIT"],
      links: %{}
    ]
  end
end
