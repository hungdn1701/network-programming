package netlab.stream;

import java.io.IOException;
import java.io.InputStream;

/**
 * V04, slide 6: đọc đúng contract — gọi read đến khi trả -1, và chỉ dùng n byte đầu của mảng sau mỗi lần đọc.
 *
 * <p>Chạy: {@code java -cp out netlab.stream.ReadLoop}
 */
public final class ReadLoop {

    public static void main(String[] args) throws IOException {
        byte[] buf = new byte[4096];
        int total = 0;
        try (InputStream in = new ChunkedInputStream(10_000)) {  // giả lập: dữ liệu đến thành nhiều đợt
            int n;
            while ((n = in.read(buf)) != -1) {  // -1: hết dữ liệu
                System.out.println("read() -> " + n);
                total += n;  // dùng n, không dùng buf.length
            }
        }
        System.out.println("total = " + total);
    }
}
