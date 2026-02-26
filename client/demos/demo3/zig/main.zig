const std = @import("std");
pub const interface = @import("interface.zig");
pub const MemoryMap = interface.MemoryMap;
pub const fft_module = @import("FFT.zig");
pub const rendering = @import("rendering.zig");

export fn fft() void {
    fft_module.fft();
}

export fn draw() void {
    rendering.draw();
}

export fn mem_test() void {}
