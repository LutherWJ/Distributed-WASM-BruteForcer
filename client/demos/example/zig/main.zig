const std = @import("std");

const allocator = std.heap.page_allocator;
var str_ptr: *[]const u8 = undefined;

export fn main() usize {
    const str = "Hello World";
    const mem = try allocator.create(u8, str.len);
    @memcpy(mem, str);

    str_ptr = &str;
    return str.len;
}

export fn getOutAddress() usize {
    return str_ptr;
}
