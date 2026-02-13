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
    exe.initial_memory = 3276800; // ~3.2MB (50 pages * 64KB)
    exe.max_memory = 4294967296;
    exe.shared_memory = true;

    b.installArtifact(exe);
}
