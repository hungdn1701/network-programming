package netlab.web;

import java.io.IOException;
import java.net.Socket;

/**
 * V10: client chậm. Kết nối tới web server nhưng không gửi request nào trong 8 giây, như một trình duyệt mở kết nối rồi
 * chưa dùng tới. Server tuần tự bị chặn ở readLine của kết nối này đến khi read timeout 5 giây hết hạn; các client khác
 * phải chờ.
 *
 * <p>Chạy: {@code java -cp out netlab.web.IdleClient}
 */
public final class IdleClient {

    public static void main(String[] args) throws IOException, InterruptedException {
        try (Socket socket = new Socket("127.0.0.1", 9199)) {
            System.out.println("connected from port " + socket.getLocalPort() + ", sending nothing");
            Thread.sleep(8_000);
        }
    }
}
