const std = @import("std");

const CrackError = error{
    RangeExceeded,
    InvalidCharacter,
    IncrementError,
};

var attempts: u32 = 0;
var found_password: [64]u8 = undefined;
var input_buffer: [256]u8 = undefined;

export fn crack(target_ptr: [*]const u8, target_len: usize, charset_ptr: [*]const u8, charset_len: usize, password_length: u32, job_start: u32, job_range: u32) bool {
    const target = target_ptr[0..target_len];
    const charset = charset_ptr[0..charset_len];

    if (password_length > 64) return false;

    var buffer: [64]u8 = undefined;
    const buf = buffer[0..password_length];

    index_to_password(job_start, password_length, charset, buf);

    var i: u32 = 0;
    while (i < job_range) : (i += 1) {
        attempts += 1;
        if (hash_and_check(target, buf)) {
            @memcpy(found_password[0..password_length], buf);
            return true;
        }

        increment_char(buf, charset) catch return false;
    }

    return false;
}

export fn get_count_ptr() *u32 {
    return &attempts;
}

export fn get_password_ptr() [*]u8 {
    return &found_password;
}

export fn get_input_buffer_ptr() [*]u8 {
    return &input_buffer;
}

fn hash_and_check(target: []const u8, buf: []u8) bool {
    var hash: [32]u8 = undefined;
    std.crypto.hash.sha2.Sha256.hash(buf, &hash, .{});
    return std.mem.eql(u8, &hash, target);
}

fn increment_char(buf: []u8, charset: []const u8) CrackError!void {
    var i = buf.len;

    while (i > 0) {
        i -= 1;
        const char = buf[i];
        const pos = std.mem.indexOfScalar(u8, charset, char) orelse return CrackError.IncrementError;

        if (pos < charset.len - 1) {
            buf[i] = charset[pos + 1];
            return;
        } else {
            buf[i] = charset[0];
        }
    }
    return CrackError.RangeExceeded;
}

fn index_to_password(index: u32, password_length: u32, charset: []const u8, buf: []u8) void {
    var remaining = index;
    var i = password_length;

    while (i > 0) : (i -= 1){
        buf[i - 1] = charset[remaining % charset.len];
        remaining /= charset.len;
    }
}
