package netlab.stream;

import java.io.IOException;
import java.io.InputStream;

/**
 * V04, slide 5: SAI — gọi read một lần và coi như đã đọc hết. read chỉ trả phần dữ liệu đã đến.
 *
 * <p>Chạy: {@code java -cp out netlab.stream.ReadOnce}
 */
public final class ReadOnce {

    public static void main(String[] args) throws IOException {
        byte[] buf = new byte[4096];
        try (InputStream in = new ChunkedInputStream(10_000)) {  // giả lập: dữ liệu đến thành nhiều đợt
            int n = in.read(buf);  // SAI: chỉ gọi read một lần
            System.out.println("read() -> " + n + " of 10000 bytes");
        }
    }
}
