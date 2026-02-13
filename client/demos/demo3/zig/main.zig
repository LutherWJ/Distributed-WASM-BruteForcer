const std = @import("std");

pub const MemoryMap = struct {
    // Audio Input (Worker -> FFT)
    pub const FFT_INPUT_OFFSET: usize = 0x00000;
    pub const FFT_INPUT_MAX_SAMPLES: usize = 4096;

    // FFT Output (FFT -> Renderer)
    pub const FFT_OUTPUT_OFFSET: usize = 0x04000;
    pub const FFT_OUTPUT_MAX_BINS: usize = 2048;

    // Metadata (Shared)
    pub const METADATA_OFFSET: usize = 0x06000;
    pub const Metadata = extern struct {
        sample_rate: u32,
        fft_size: u32,
        current_time: f32,
        global_volume: f32,
    };

    // Framebuffer (Renderer -> JS Canvas)
    pub const FRAMEBUFFER_OFFSET: usize = 0x40000;
    pub const FB_WIDTH: usize = 800;
    pub const FB_HEIGHT: usize = 600;

    // Scratchpad for FFT (Intermediate Complex data)
    pub const SCRATCHPAD_OFFSET: usize = 0x10000;
};

const fft_mod = @import("FFT.zig");
const rendering_mod = @import("rendering.zig");

export fn fft() void {
    fft_mod.fft();
}

export fn draw() void {
    rendering_mod.draw();
}
