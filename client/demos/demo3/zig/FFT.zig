const std = @import("std");
const interface = @import("main.zig");
const MemoryMap = interface.MemoryMap;
const Complex = std.math.Complex(f32);

pub fn fft() void {
    const metadata: *MemoryMap.Metadata = @ptrFromInt(MemoryMap.METADATA_OFFSET);
    const fft_size = metadata.fft_size;
    
    // Safety check: ensure fft_size is valid and fits in our scratchpad (4096 samples)
    if (fft_size == 0 or fft_size > 4096) return;

    const input_ptr: [*]allowzero f32 = @ptrFromInt(MemoryMap.FFT_INPUT_OFFSET);
    
    // Use the scratchpad area instead of the stack to avoid overflows
    const data_ptr: [*]allowzero Complex = @ptrFromInt(MemoryMap.SCRATCHPAD_OFFSET);
    const data = data_ptr[0..fft_size];
    
    // 0. Copy real input to complex scratchpad
    var i: usize = 0;
    while (i < fft_size) : (i += 1) {
        data[i] = Complex.init(input_ptr[i], 0);
    }

    // 1. Bit-reversal permutation
    var j: usize = 0;
    for (0..fft_size) |idx| {
        if (idx < j) {
            const temp = data[idx];
            data[idx] = data[j];
            data[j] = temp;
        }
        var m = fft_size >> 1;
        while (m >= 1 and j >= m) : (m >>= 1) {
            j -= m;
        }
        j += m;
    }

    // 2. Iterative Cooley-Tukey FFT
    var len: usize = 2;
    while (len <= fft_size) : (len *= 2) {
        const angle = -2.0 * std.math.pi / @as(f32, @floatFromInt(len));
        const w_len = Complex.init(@cos(angle), @sin(angle));

        var start: usize = 0;
        while (start < fft_size) : (start += len) {
            var w = Complex.init(1, 0);
            for (0..len / 2) |k| {
                const u = data[start + k];
                const v = data[start + k + len / 2].mul(w);
                data[start + k] = u.add(v);
                data[start + k + len / 2] = u.sub(v);
                w = w.mul(w_len);
            }
        }
    }

    const output_ptr: [*]allowzero f32 = @ptrFromInt(MemoryMap.FFT_OUTPUT_OFFSET);
    for (0..fft_size / 2) |idx| {
        output_ptr[idx] = data[idx].magnitude();
    }
}
