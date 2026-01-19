# A fork of the code in https://github.com/vonagam/ash_ulid which seems to be the best implementation but also
# depends on the whole framework.  Modified heavily, it's not even a ulid anymore.

# ORIGINAL LICENSE FOR THIS FILE:

# MIT License
# Copyright (c) 2023 Dmitry Maganov
# Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation
# files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy,
# modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software
# is furnished to do so, subject to the following conditions:
# The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
# OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
# LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
# IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

# MODIFICATIONS BEYOND THE ORIGINAL FILE Copyright (c) 2025, Prefactor Pty Ltd

# Our format is like this:

# 01an4z07byd9df0k79ka1307sr9x4mv3
# |--------||----||--------------|
#  Time      Part  Randomness
#  48bits    30b   80bits

# The "part" is "partition" and is 30 bits.
# The other sections are just like normal ulid

# Bit length = 160 (48 + 32 + 80)  Note that the partition field is 32 bits, but only 30 bits are used.  We're maintaining byte alignment for the fields.
# Character length = 32 (256 bits)

defmodule Pfid do
  defmodule PfidError do
    defexception [:code, :message]

    def make(code, problem: problem) do
      %PfidError{
        code: code,
        message:
          case code do
            :invalid_binary -> "invalid binary PFID: #{inspect(problem)}"
            :invalid_pfid -> "invalid PFID: #{inspect(problem)}"
            :invalid_partition -> "invalid partition: #{inspect(problem)}"
          end
      }
    end
  end

  defguard valid_timestamp?(timestamp)
           when is_integer(timestamp) and timestamp >= 0 and timestamp < 281_474_976_710_656

  defguard valid_partition?(partition)
           when is_integer(partition) and partition >= 0 and partition < 1_073_741_824

  @moduledoc """
  Helpers for working with PFIDs.
  """

  @typedoc """
  A Crockford Base32 encoded PFID string.
  """
  @type t :: <<_::256>>

  @typedoc """
  A raw binary representation of a PFID.
  """
  @type binary_pfid :: <<_::160>>

  @typedoc """
  A partition number for a PFID.
  """
  @type partition :: 0..1_073_741_823

  @typedoc """
  A timestamp for a PFID.
  """
  @type timestamp :: 0..281_474_976_710_655

  @doc """
  A zero PFID -- probably don't actually use it, but if you need a placeholder.
  """
  @spec zero() :: t
  def zero() do
    "00000000000000000000000000000000"
  end

  @doc """
  Generate a Crockford Base32 encoded PFID string with current time.
  """
  @spec generate(partition) :: t
  def generate(partition) when valid_partition?(partition) do
    unsafe_encode(generate_binary(partition))
  end

  @doc """
  Generate a Crockford Base32 encoded PFID string with a provided Unix timestamp.
  """
  @spec generate(partition, timestamp) :: t
  def generate(partition, timestamp)
      when valid_partition?(partition) and valid_timestamp?(timestamp) do
    unsafe_encode(generate_binary(partition, timestamp))
  end

  @doc """
  Generate an ID suitable for use in an example -- it's well into the past.
  """
  def generate_example() do
    generate(123_456_789, 1_234_567_890_000)
  end

  @doc """
  Generate an ID with the same partition as an existing PFID.
  """
  def generate_related(existing_pfid) do
    generate(extract_partition!(existing_pfid))
  end

  @doc """
  Generate an ID with a random partition.
  """
  def generate_root() do
    generate(generate_partition())
  end

  @doc """
  Generate a binary PFID with current time.
  """
  @spec generate_binary(partition) :: binary_pfid
  def generate_binary(partition) when valid_partition?(partition) do
    <<System.system_time(:millisecond)::unsigned-size(48), partition::unsigned-size(32),
      :crypto.strong_rand_bytes(10)::binary>>
  end

  @doc """
  Generate a binary PFID with a provided Unix timestamp.
  """
  @spec generate_binary(partition, timestamp) :: binary_pfid
  def generate_binary(partition, timestamp)
      when valid_partition?(partition) and valid_timestamp?(timestamp) do
    <<timestamp::unsigned-size(48), partition::unsigned-size(32),
      :crypto.strong_rand_bytes(10)::binary>>
  end

  @spec is_pfid?(string :: any) :: boolean()
  def is_pfid?(string) when is_binary(string) do
    String.match?(string, ~r/^[0-7][0-9abcdefghjkmnpqrstvwxyz]{31}$/)
  end

  def is_pfid?(_) do
    false
  end

  defp unsafe_encode(
         <<t1::3, t2::5, t3::5, t4::5, t5::5, t6::5, t7::5, t8::5, t9::5, t10::5, 0::2, p1::5,
           p2::5, p3::5, p4::5, p5::5, p6::5, r1::5, r2::5, r3::5, r4::5, r5::5, r6::5, r7::5,
           r8::5, r9::5, r10::5, r11::5, r12::5, r13::5, r14::5, r15::5, r16::5>>
       ) do
    <<e(t1), e(t2), e(t3), e(t4), e(t5), e(t6), e(t7), e(t8), e(t9), e(t10), e(p1), e(p2), e(p3),
      e(p4), e(p5), e(p6), e(r1), e(r2), e(r3), e(r4), e(r5), e(r6), e(r7), e(r8), e(r9), e(r10),
      e(r11), e(r12), e(r13), e(r14), e(r15), e(r16)>>
  end

  def encode(binary) when is_binary(binary) and byte_size(binary) == 20 do
    encoded = unsafe_encode(binary)

    if is_pfid?(encoded) do
      {:ok, encoded}
    else
      {:error, PfidError.make(:invalid_binary, problem: binary)}
    end
  end

  def encode(value) do
    {:error, PfidError.make(:invalid_binary, problem: value)}
  end

  def decode(
        <<t1::8, t2::8, t3::8, t4::8, t5::8, t6::8, t7::8, t8::8, t9::8, t10::8, p1::8, p2::8,
          p3::8, p4::8, p5::8, p6::8, r1::8, r2::8, r3::8, r4::8, r5::8, r6::8, r7::8, r8::8,
          r9::8, r10::8, r11::8, r12::8, r13::8, r14::8, r15::8, r16::8>> = binary
      )
      when t1 < ?8 do
    {:ok,
     <<d(t1)::3, d(t2)::5, d(t3)::5, d(t4)::5, d(t5)::5, d(t6)::5, d(t7)::5, d(t8)::5, d(t9)::5,
       d(t10)::5, 0::2, d(p1)::5, d(p2)::5, d(p3)::5, d(p4)::5, d(p5)::5, d(p6)::5, d(r1)::5,
       d(r2)::5, d(r3)::5, d(r4)::5, d(r5)::5, d(r6)::5, d(r7)::5, d(r8)::5, d(r9)::5, d(r10)::5,
       d(r11)::5, d(r12)::5, d(r13)::5, d(r14)::5, d(r15)::5, d(r16)::5>>}
  catch
    :error ->
      {:error, PfidError.make(:invalid_pfid, problem: binary)}
  end

  def decode(value) do
    {:error, PfidError.make(:invalid_pfid, problem: value)}
  end

  def decode_partition(<<p1::8, p2::8, p3::8, p4::8, p5::8, p6::8>> = binary) do
    {:ok,
     :binary.decode_unsigned(<<0::2, d(p1)::5, d(p2)::5, d(p3)::5, d(p4)::5, d(p5)::5, d(p6)::5>>)}
  catch
    :error ->
      {:error, PfidError.make(:invalid_partition, problem: binary)}
  end

  def decode_partition(value) do
    {:error, PfidError.make(:invalid_partition, problem: value)}
  end

  def extract_partition(<<_::80, encoded_partition::binary-size(6), _::128>> = string) do
    if is_pfid?(string) do
      decode_partition(encoded_partition)
    else
      {:error, PfidError.make(:invalid_pfid, problem: string)}
    end
  end

  def extract_partition(value) do
    {:error, PfidError.make(:invalid_pfid, problem: value)}
  end

  def extract_partition!(pfid) do
    case extract_partition(pfid) do
      {:ok, value} -> value
      {:error, error} -> raise error
    end
  end

  def generate_partition() do
    <<_::2, partition::30>> = :crypto.strong_rand_bytes(4)
    partition
  end

  @compile {:inline, e: 1}
  defp e(0), do: ?0
  defp e(1), do: ?1
  defp e(2), do: ?2
  defp e(3), do: ?3
  defp e(4), do: ?4
  defp e(5), do: ?5
  defp e(6), do: ?6
  defp e(7), do: ?7
  defp e(8), do: ?8
  defp e(9), do: ?9
  defp e(10), do: ?a
  defp e(11), do: ?b
  defp e(12), do: ?c
  defp e(13), do: ?d
  defp e(14), do: ?e
  defp e(15), do: ?f
  defp e(16), do: ?g
  defp e(17), do: ?h
  defp e(18), do: ?j
  defp e(19), do: ?k
  defp e(20), do: ?m
  defp e(21), do: ?n
  defp e(22), do: ?p
  defp e(23), do: ?q
  defp e(24), do: ?r
  defp e(25), do: ?s
  defp e(26), do: ?t
  defp e(27), do: ?v
  defp e(28), do: ?w
  defp e(29), do: ?x
  defp e(30), do: ?y
  defp e(31), do: ?z

  @compile {:inline, d: 1}
  defp d(?0), do: 0
  defp d(?1), do: 1
  defp d(?2), do: 2
  defp d(?3), do: 3
  defp d(?4), do: 4
  defp d(?5), do: 5
  defp d(?6), do: 6
  defp d(?7), do: 7
  defp d(?8), do: 8
  defp d(?9), do: 9
  defp d(?a), do: 10
  defp d(?b), do: 11
  defp d(?c), do: 12
  defp d(?d), do: 13
  defp d(?e), do: 14
  defp d(?f), do: 15
  defp d(?g), do: 16
  defp d(?h), do: 17
  defp d(?j), do: 18
  defp d(?k), do: 19
  defp d(?m), do: 20
  defp d(?n), do: 21
  defp d(?p), do: 22
  defp d(?q), do: 23
  defp d(?r), do: 24
  defp d(?s), do: 25
  defp d(?t), do: 26
  defp d(?v), do: 27
  defp d(?w), do: 28
  defp d(?x), do: 29
  defp d(?y), do: 30
  defp d(?z), do: 31
  defp d(_), do: throw(:error)
end
