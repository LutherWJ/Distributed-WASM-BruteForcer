const std = @import("std");
const interface = @import("interface.zig");
const MemoryMap = interface.MemoryMap;
const Complex = std.math.Complex(f32);

pub fn fft() void {
    const metadata: *MemoryMap.Metadata = @ptrFromInt(MemoryMap.METADATA_OFFSET);
    const fft_size = metadata.fft_size;

    // Ensure fft_size is within bounds and a power of 2
    if (fft_size > MemoryMap.FFT_INPUT_MAX_SAMPLES or fft_size < 2 or (fft_size & (fft_size - 1)) != 0) {
        return;
    }

    const input: [*]allowzero f32 = @ptrFromInt(MemoryMap.FFT_INPUT_OFFSET);
    const output: [*]f32 = @ptrFromInt(MemoryMap.FFT_OUTPUT_OFFSET);
    const scratch: [*]Complex = @ptrFromInt(MemoryMap.SCRATCHPAD_OFFSET);

    // 1. Copy input to scratch as complex numbers and apply a Hann window
    for (0..fft_size) |i| {
        const float_i = @as(f32, @floatFromInt(i));
        const float_n = @as(f32, @floatFromInt(fft_size));
        const hann = 0.5 * (1.0 - std.math.cos(2.0 * std.math.pi * float_i / (float_n - 1.0)));
        scratch[i] = Complex.init(input[i] * hann, 0.0);
    }

    // 2. Bit-reversal permutation
    var j: usize = 0;
    for (0..fft_size) |i| {
        if (i < j) {
            const temp = scratch[i];
            scratch[i] = scratch[j];
            scratch[j] = temp;
        }
        var m = fft_size >> 1;
        while (m >= 1 and j >= m) {
            j -= m;
            m >>= 1;
        }
        j += m;
    }

    // 3. Cooley-Tukey Radix-2 FFT
    var step: usize = 1;
    while (step < fft_size) {
        const jump = step << 1;
        const angle = -std.math.pi / @as(f32, @floatFromInt(step));

        var m: usize = 0;
        while (m < step) : (m += 1) {
            const float_m = @as(f32, @floatFromInt(m));
            const w = Complex.init(std.math.cos(angle * float_m), std.math.sin(angle * float_m));

            var i: usize = m;
            while (i < fft_size) : (i += jump) {
                const k = i + step;
                const t = scratch[k].mul(w);
                scratch[k] = scratch[i].sub(t);
                scratch[i] = scratch[i].add(t);
            }
        }
        step = jump;
    }

    // 4. Calculate magnitudes for the first half of the bins
    const num_bins = fft_size / 2;
    for (0..num_bins) |i| {
        const re = scratch[i].re;
        const im = scratch[i].im;
        // Restore a less aggressive normalization
        const mag = std.math.sqrt(re * re + im * im) / @as(f32, @floatFromInt(fft_size));
        output[i] = mag;
    }
}
