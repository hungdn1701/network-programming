package netlab.ws;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * V18: một WebSocket frame (RFC 6455, mục 5.2), chỉ đủ cho ví dụ: đọc frame từ client (luôn có mask), ghi frame từ
 * server (không mask, dữ liệu tối đa 65 535 byte).
 */
record Frame(boolean fin, int opcode, boolean masked, byte[] payload) {

    static final int TEXT = 0x1, BINARY = 0x2, CLOSE = 0x8, PING = 0x9, PONG = 0xA;

    static Frame read(InputStream in) throws IOException {
        int b0 = readByte(in), b1 = readByte(in);
        boolean fin = (b0 & 0x80) != 0;      // bit FIN: frame cuối của message
        int opcode = b0 & 0x0F;              // loại frame: text, binary, close, ping, pong
        boolean masked = (b1 & 0x80) != 0;   // frame từ client luôn có mask 4 byte
        long len = b1 & 0x7F;                // 0–125: độ dài; 126: 2 byte sau; 127: 8 byte sau
        if (len == 126) {
            len = (readByte(in) << 8) | readByte(in);
        } else if (len == 127) {
            len = 0;
            for (int i = 0; i < 8; i++) {
                len = (len << 8) | readByte(in);
            }
        }
        byte[] mask = masked ? in.readNBytes(4) : null;
        byte[] payload = in.readNBytes((int) len);
        if (masked) {
            for (int i = 0; i < payload.length; i++) {
                payload[i] ^= mask[i % 4];   // bỏ mask: XOR với 4 byte mask
            }
        }
        return new Frame(fin, opcode, masked, payload);
    }

    static void write(OutputStream out, int opcode, byte[] payload) throws IOException {
        out.write(0x80 | opcode);            // FIN = 1: mỗi message một frame
        if (payload.length <= 125) {
            out.write(payload.length);       // server không mask: bit mask = 0
        } else {
            out.write(126);
            out.write(payload.length >> 8);
            out.write(payload.length & 0xFF);
        }
        out.write(payload);
        out.flush();
    }

    String text() {
        return new String(payload, UTF_8);
    }

    private static int readByte(InputStream in) throws IOException {
        int b = in.read();
        if (b < 0) {
            throw new EOFException("connection closed without close frame");
        }
        return b;
    }

    @Override
    public String toString() {
        String name = switch (opcode) {
            case TEXT -> "text";
            case BINARY -> "binary";
            case CLOSE -> "close";
            case PING -> "ping";
            case PONG -> "pong";
            default -> "0x" + Integer.toHexString(opcode);
        };
        String data = opcode == CLOSE && payload.length >= 2
                ? "code " + (((payload[0] & 0xFF) << 8) | (payload[1] & 0xFF))
                : "\"" + text() + "\"";
        return "FIN=" + (fin ? 1 : 0) + " opcode=" + opcode + " (" + name + ") masked=" + masked
                + " length=" + payload.length + " " + data;
    }
}
