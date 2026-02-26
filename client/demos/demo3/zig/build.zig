const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.resolveTargetQuery(.{
        .cpu_arch = .wasm32,
        .os_tag = .freestanding,
        .cpu_features_add = std.Target.wasm.featureSet(&.{
            .atomics,
            .bulk_memory,
        }),
    });

    const optimize = b.standardOptimizeOption(.{});

    const exe = b.addExecutable(.{
        .name = "main",
        .root_source_file = b.path("main.zig"),
        .target = target,
        .optimize = optimize,
    });

    exe.entry = .disabled;
    exe.rdynamic = true;
    
    exe.import_memory = true;
    // initial_memory is in bytes. 100 pages * 64KB = 6.4MB = 6,553,600 bytes
    exe.initial_memory = 6553600; 
    exe.max_memory = 6553600;
    exe.shared_memory = true;

    b.installArtifact(exe);
}
