package netlab.reliable;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.nio.ByteBuffer;
import java.util.zip.CRC32;

/**
 * V34: một message của giao thức tra cứu trên UDP, nằm gọn trong một datagram:
 * request ID (4 byte) | nội dung UTF-8 | CRC32 của hai phần trước (4 byte).
 * Bên nhận tính lại CRC32; không khớp thì bỏ datagram, như datagram bị mất.
 */
record Message(int id, String text) {

    static final int MAX_DATAGRAM = 512;

    static final class CorruptException extends Exception {
        CorruptException(String message) {
            super(message);
        }
    }

    byte[] encode() {
        byte[] body = text.getBytes(UTF_8);
        ByteBuffer b = ByteBuffer.allocate(4 + body.length + 4);
        b.putInt(id).put(body);
        b.putInt((int) crc(b.array(), 4 + body.length));  // checksum của request ID và nội dung
        return b.array();
    }

    static Message decode(byte[] data, int length) throws CorruptException {
        if (length < 8) {
            throw new CorruptException("datagram too short");
        }
        ByteBuffer b = ByteBuffer.wrap(data, 0, length);
        if (b.getInt(length - 4) != (int) crc(data, length - 4)) {  // tính lại, so với CRC32 bên gửi ghi
            throw new CorruptException("CRC32 mismatch");
        }
        return new Message(b.getInt(0), new String(data, 4, length - 8, UTF_8));
    }

    private static long crc(byte[] data, int length) {
        CRC32 crc = new CRC32();
        crc.update(data, 0, length);
        return crc.getValue();
    }
}
