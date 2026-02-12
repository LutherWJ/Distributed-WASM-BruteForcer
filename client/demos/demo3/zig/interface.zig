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

        pub const OFFSET_SAMPLE_RATE: usize = 0;
        pub const OFFSET_FFT_SIZE: usize = 4;
        pub const OFFSET_CURRENT_TIME: usize = 8;
        pub const OFFSET_GLOBAL_VOLUME: usize = 12;
    };

    // Framebuffer (Renderer -> JS Canvas)
    pub const FRAMEBUFFER_OFFSET: usize = 0x40000;
    pub const FB_WIDTH: usize = 800;
    pub const FB_HEIGHT: usize = 600;
};
