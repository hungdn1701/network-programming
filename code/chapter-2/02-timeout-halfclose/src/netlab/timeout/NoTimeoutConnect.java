package netlab.timeout;

import java.io.IOException;
import java.net.Socket;

/**
 * V09, đọc thêm: connect không có timeout tới một địa chỉ không phản hồi. Lời gọi chờ đến khi TCP của hệ điều hành
 * thôi gửi lại SYN (Windows 11: khoảng 21 giây; Linux mặc định khoảng 127 giây), rồi ném ConnectException.
 *
 * <p>Chạy: {@code java -cp out netlab.timeout.NoTimeoutConnect}
 */
public final class NoTimeoutConnect {

    public static void main(String[] args) {
        long start = System.nanoTime();
        try (Socket socket = new Socket("192.0.2.1", 9199)) {  // constructor gọi connect, không có timeout
            System.out.println("connected");
        } catch (IOException e) {
            System.out.println("192.0.2.1: " + e.getClass().getSimpleName() + ": " + e.getMessage()
                    + " after " + (System.nanoTime() - start) / 1_000_000 + " ms");
        }
    }
}
