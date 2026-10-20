package netlab.stream;

import java.io.InputStream;

/**
 * Giả lập dữ liệu đến qua mạng thành nhiều đợt: mỗi lần read trả tối đa phần dữ liệu của một đợt
 * (kích thước giống các segment TCP), dù mảng của bên đọc còn chỗ. Hết dữ liệu thì trả -1.
 * Qua TCP thật, số byte mỗi lần read trả về phụ thuộc lúc dữ liệu đến và không đoán trước được.
 */
final class ChunkedInputStream extends InputStream {

    private static final int[] CHUNKS = {1460, 2920, 512, 1460, 3648};

    private final int total;
    private int position;
    private int chunk;
    private int leftInChunk;

    ChunkedInputStream(int total) {
        this.total = total;
    }

    @Override
    public int read() {
        byte[] one = new byte[1];
        return read(one, 0, 1) == -1 ? -1 : one[0] & 0xFF;
    }

    @Override
    public int read(byte[] b, int off, int len) {
        if (position >= total) {
            return -1;
        }
        if (len == 0) {
            return 0;
        }
        if (leftInChunk == 0) {
            leftInChunk = CHUNKS[chunk++ % CHUNKS.length];
        }
        int n = Math.min(len, Math.min(leftInChunk, total - position));
        for (int i = 0; i < n; i++) {
            b[off + i] = (byte) ('a' + (position + i) % 26);
        }
        position += n;
        leftInChunk -= n;
        return n;
    }
}
