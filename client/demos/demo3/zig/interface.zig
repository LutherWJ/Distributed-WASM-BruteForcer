const std = @import("std");

pub const MemoryMap = struct {
    // Audio Input (Worker -> FFT)
    pub const FFT_INPUT_OFFSET: usize = 0x10000;
    pub const FFT_INPUT_MAX_SAMPLES: usize = 4096;

    // FFT Output (FFT -> Renderer)
    pub const FFT_OUTPUT_OFFSET: usize = 0x14000;
    pub const FFT_OUTPUT_MAX_BINS: usize = 2048;

    // Metadata (Shared)
    pub const METADATA_OFFSET: usize = 0x16000;
    pub const Metadata = extern struct {
        sample_rate: u32,
        fft_size: u32,
        current_time: f32,
        global_volume: f32,
    };

    // Debugging (Shared)
    pub const DEBUG_OFFSET: usize = 0x17000;
    pub const DEBUG_SIZE: usize = 1024;

    // Framebuffer (Renderer -> JS Canvas)
    pub const FRAMEBUFFER_OFFSET: usize = 0x40000;
    pub const FB_WIDTH: usize = 800;
    pub const FB_HEIGHT: usize = 600;

    // Scratchpad for FFT (Intermediate Complex data)
    pub const SCRATCHPAD_OFFSET: usize = 0x20000;
};

// Imported Host Functions
pub extern fn log_u32(value: u32) void;
pub extern fn log_f32(value: f32) void;
