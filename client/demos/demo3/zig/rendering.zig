const std = @import("std");
const MemoryMap = @import("main.zig").MemoryMap;

// Color helper
fn color(r: u8, g: u8, b: u8, a: u8) u32 {
    return (@as(u32, a) << 24) | (@as(u32, b) << 16) | (@as(u32, g) << 8) | @as(u32, r);
}

pub fn draw() void {
    const width = MemoryMap.FB_WIDTH;
    const height = MemoryMap.FB_HEIGHT;
    
    // Pointers
    const metadata: *MemoryMap.Metadata = @ptrFromInt(MemoryMap.METADATA_OFFSET);
    const fft_data: [*]allowzero f32 = @ptrFromInt(MemoryMap.FFT_OUTPUT_OFFSET);
    const framebuffer: [*]allowzero u32 = @ptrFromInt(MemoryMap.FRAMEBUFFER_OFFSET);
    
    const fft_size = metadata.fft_size;
    const time = metadata.current_time;
    
    // Clear screen (Dark Blue-ish Black for visibility)
    const fb_slice = framebuffer[0..width*height];
    if (fft_size == 0) {
        @memset(fb_slice, color(255, 0, 0, 255)); // Red screen if no metadata
        return;
    }
    @memset(fb_slice, color(10, 10, 30, 255));

    // Heartbeat Dot: White dot moving at the top
    const dot_x = @as(usize, @intFromFloat(@mod(time * 50.0, @as(f32, @floatFromInt(width)))));
    var dx: usize = 0;
    while (dx < 10) : (dx += 1) {
        var dy: usize = 0;
        while (dy < 10) : (dy += 1) {
            const px = dot_x + dx;
            if (px < width) {
                framebuffer[(20 + dy) * width + px] = color(255, 255, 255, 255);
            }
        }
    }
    
    // Configuration
    const num_bars: usize = 64;
    const bar_width: usize = 10;
    const gap: usize = 2; 
    const total_bar_width = bar_width + gap;
    
    const usable_bins = fft_size / 2;
    const bins_per_bar = usable_bins / num_bars;
    
    const total_viz_width = num_bars * total_bar_width; 
    const x_offset = (width - total_viz_width) / 2; 
    
    var i: usize = 0;
    while (i < num_bars) : (i += 1) {
        var sum: f32 = 0;
        var j: usize = 0;
        const group_size = if (bins_per_bar > 0) bins_per_bar else 1;
        
        while (j < group_size) : (j += 1) {
             const idx = i * group_size + j;
             if (idx < usable_bins) {
                sum += fft_data[idx];
             }
        }
        const avg = sum / @as(f32, @floatFromInt(group_size));
        
        // Boost the signal significantly for visibility
        var bar_height: usize = @intFromFloat(avg * 1000.0); 
        if (bar_height > height) bar_height = height;
        if (bar_height < 2) bar_height = 2; // Always show at least a tiny sliver if music is playing
        
        const x_start = x_offset + (i * total_bar_width);
        
        var y: usize = 0;
        while (y < bar_height) : (y += 1) {
             const py = height - 1 - y;
             const g = @as(u8, @intCast(@min(255, y * 2)));
             const bar_color = color(g, 255, 0, 255);
             
             var px: usize = 0;
             while (px < bar_width) : (px += 1) {
                 const pixel_idx = py * width + (x_start + px);
                 framebuffer[pixel_idx] = bar_color; 
             }
        }
    }
}
