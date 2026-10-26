package netlab.stream;

import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * V04, slide 7: BufferedOutputStream (decorator) giữ byte trong buffer; chỉ flush mới đẩy xuống stream bên dưới.
 * CountingOutputStream đứng ở vị trí của stream lấy từ socket và đếm số byte đã xuống tới nó.
 *
 * <p>Chạy: {@code java -cp out netlab.stream.FlushDemo}
 */
public final class FlushDemo {

    public static void main(String[] args) throws IOException {
        var sink = new CountingOutputStream();  // ở vị trí stream của socket
        try (var out = new BufferedOutputStream(sink)) {  // decorator: thêm buffer 8192 byte
            out.write("hello\n".getBytes(StandardCharsets.UTF_8));
            System.out.println("after write(): " + sink.count() + " bytes passed down");
            out.flush();
            System.out.println("after flush(): " + sink.count() + " bytes passed down");
        }
    }

    /** Stream đích chỉ đếm số byte nhận được. */
    static final class CountingOutputStream extends OutputStream {
        private int count;

        @Override
        public void write(int b) {
            count++;
        }

        @Override
        public void write(byte[] b, int off, int len) {
            count += len;
        }

        int count() {
            return count;
        }
    }
}
