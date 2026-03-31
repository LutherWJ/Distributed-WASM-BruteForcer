const std = @import("std");

// Use the standard WASM allocator
const allocator = std.heap.wasm_allocator;

var str_ptr: [*]u8 = undefined;
var str_len: usize = 0;

export fn hello() usize {
    const message = "Hello World!";

    // Allocate memory on the WASM heap
    const buffer = allocator.alloc(u8, message.len) catch return 0;
    @memcpy(buffer, message);

    str_ptr = buffer.ptr;
    str_len = buffer.len;

    return str_len;
}

export fn getOutAddress() [*]u8 {
    return str_ptr;
}

// Reconstruct the slice from the pointer and length to free it
export fn freeHello() void {
    allocator.free(str_ptr[0..str_len]);
}
