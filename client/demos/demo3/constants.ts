export const MEMORY_MAP = {
  // Audio Input (Worker -> FFT)
  FFT_INPUT_OFFSET: 0x10000,
  FFT_INPUT_MAX_SAMPLES: 4096,

  // FFT Output (FFT -> Renderer)
  FFT_OUTPUT_OFFSET: 0x14000,
  FFT_OUTPUT_MAX_BINS: 2048,

  // Metadata (Shared)
  METADATA_OFFSET: 0x16000,
  METADATA_SIZE: 1024,

  // Debugging (Shared)
  DEBUG_OFFSET: 0x17000,
  DEBUG_SIZE: 1024,

  // Framebuffer (Renderer -> JS Canvas)
  FRAMEBUFFER_OFFSET: 0x40000,
};

export const RENDER_CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
};

export const AUDIO_CONFIG = {
  DEFAULT_FFT_SIZE: 2048,
};

// Metadata Struct Offsets (matches interface.zig)
export const META_OFFSETS = {
  SAMPLE_RATE: 0,
  FFT_SIZE: 4,
  CURRENT_TIME: 8,
  GLOBAL_VOLUME: 12,
};
