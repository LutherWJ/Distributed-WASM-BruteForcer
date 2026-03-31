const std = @import("std");

const allocator = std.heap.page_allocator;
var str_ptr: [*]const u8 = undefined;

export fn main() usize {
    const str = "Hello World";
    const mem = allocator.alloc(u8, str.len) catch return 0;
    @memcpy(mem, str);
    str_ptr = @ptrCast(&str);
    return str.len;
}

export fn getOutAddress() [*]const u8 {
    return str_ptr;
}
