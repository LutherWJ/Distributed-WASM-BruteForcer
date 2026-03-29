const std = @import("std");

export fn blur(input_ptr: [*]const u8, output_ptr: [*]u8, width: u32, height: u32, radius: u32) void {
    const len = width * height * 4; // 4 color channel image
    const input = input_ptr[0..len];
    const output = output_ptr[0..len];

    // Simple copy for 0 radius or invalid input
    if (radius == 0) {
        @memcpy(output, input);
        return;
    }

    var y: u32 = 0;
    while (y < height) : (y += 1) {
        var x: u32 = 0;
        while (x < width) : (x += 1) {
            var r_sum: u32 = 0;
            var g_sum: u32 = 0;
            var b_sum: u32 = 0;
            var count: u32 = 0;

            const min_y = if (y > radius) y - radius else 0;
            const max_y = if (y + radius < height) y + radius else height - 1;
            const min_x = if (x > radius) x - radius else 0;
            const max_x = if (x + radius < width) x + radius else width - 1;

            var ky = min_y;
            while (ky <= max_y) : (ky += 1) {
                const row_offset = ky * width;
                var kx = min_x;
                while (kx <= max_x) : (kx += 1) {
                    const pixel_idx = (row_offset + kx) * 4;
                    r_sum += input[pixel_idx + 0];
                    g_sum += input[pixel_idx + 1];
                    b_sum += input[pixel_idx + 2];
                    count += 1;
                }
            }

            const idx = (y * width + x) * 4;
            // Round to nearest integer: (sum + count / 2) / count
            output[idx + 0] = @as(u8, @intCast((r_sum + (count / 2)) / count));
            output[idx + 1] = @as(u8, @intCast((g_sum + (count / 2)) / count));
            output[idx + 2] = @as(u8, @intCast((b_sum + (count / 2)) / count));
            output[idx + 3] = 255;
        }
    }
}
