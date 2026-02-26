const std = @import("std");
const MemoryMap = @import("main.zig").MemoryMap;

// Color helper: RGBA in memory order (Little Endian u32: 0xAABBGGRR)
fn color(r: u8, g: u8, b: u8, a: u8) u32 {
    return (@as(u32, a) << 24) | (@as(u32, b) << 16) | (@as(u32, g) << 8) | @as(u32, r);
}

const NUM_BARS = 64;
const BAR_GAP = 4;
const MAX_MAGNITUDE: f32 = 0.8; 

pub fn draw() void {
    const metadata: *MemoryMap.Metadata = @ptrFromInt(MemoryMap.METADATA_OFFSET);
    const fft_size = metadata.fft_size;
    const num_bins = fft_size / 2;
    const fft_output: [*]f32 = @ptrFromInt(MemoryMap.FFT_OUTPUT_OFFSET);

    const raw_buf: [*]u32 = @ptrFromInt(MemoryMap.FRAMEBUFFER_OFFSET);
    const buf_len = MemoryMap.FB_WIDTH * MemoryMap.FB_HEIGHT;
    const frame_buf: []u32 = raw_buf[0..buf_len];

    // 1. Clear background (Deep dark blue)
    @memset(frame_buf, color(5, 5, 15, 255));

    // 2. Calculate bar dimensions
    const total_gap_width = (NUM_BARS - 1) * BAR_GAP;
    const available_width = if (MemoryMap.FB_WIDTH > total_gap_width) MemoryMap.FB_WIDTH - total_gap_width else 0;
    const bar_width = available_width / NUM_BARS;
    
    // We want to center the visualizer
    const actual_total_width = NUM_BARS * bar_width + total_gap_width;
    const x_offset = (MemoryMap.FB_WIDTH - actual_total_width) / 2;

    const bins_per_bar = @as(f32, @floatFromInt(num_bins)) / @as(f32, @floatFromInt(NUM_BARS));

    for (0..NUM_BARS) |i| {
        // Linear mapping for now, but we could use log here for a better feel
        const start_bin = @as(usize, @intFromFloat(@as(f32, @floatFromInt(i)) * bins_per_bar));
        const end_bin = @as(usize, @intFromFloat(@as(f32, @floatFromInt(i + 1)) * bins_per_bar));
        
        var sum: f32 = 0;
        var count: f32 = 0;
        const actual_end = if (end_bin > num_bins) num_bins else end_bin;
        for (start_bin..actual_end) |bin_idx| {
            sum += fft_output[bin_idx];
            count += 1;
        }
        
        const avg = if (count > 0) sum / count else 0;
        
        // Intensity scaling (Logarithmic to match human hearing better)
        const intensity = std.math.log10(1.0 + avg * 1000.0) / 2.0;
        var h_ratio = intensity / MAX_MAGNITUDE;
        if (h_ratio > 1.0) h_ratio = 1.0;
        if (h_ratio < 0.0) h_ratio = 0.0;

        const max_h = @as(f32, @floatFromInt(MemoryMap.FB_HEIGHT - 40));
        const bar_height = @as(usize, @intFromFloat(h_ratio * max_h));
        
        const x_start = x_offset + i * (bar_width + BAR_GAP);
        
        // Draw the bar with a nice gradient (Cyan to Purple)
        for (0..bar_height) |h| {
            const y = MemoryMap.FB_HEIGHT - 20 - h;
            if (y >= MemoryMap.FB_HEIGHT) continue;

            const t = @as(f32, @floatFromInt(h)) / max_h;
            
            // Color interpolation
            const r = @as(u8, @intFromFloat(50.0 + t * 205.0));
            const g = @as(u8, @intFromFloat(200.0 * (1.0 - t)));
            const b = 255;
            const bar_color = color(r, g, b, 255);

            for (0..bar_width) |bw| {
                const x = x_start + bw;
                if (x < MemoryMap.FB_WIDTH) {
                    frame_buf[y * MemoryMap.FB_WIDTH + x] = bar_color;
                }
            }
        }
    }
}
