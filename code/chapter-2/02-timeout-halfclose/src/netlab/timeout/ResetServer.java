package netlab.timeout;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;

/**
 * V09, đọc thêm: server hủy kết nối bằng RST. Với SO_LINGER bằng 0, close() gửi RST thay cho FIN; client đang chờ
 * phản hồi nhận SocketException: Connection reset.
 *
 * <p>Chạy ở terminal thứ nhất: {@code java -cp out netlab.timeout.ResetServer}
 */
public final class ResetServer {

    public static void main(String[] args) throws IOException {
        try (ServerSocket listener = new ServerSocket(9199)) {
            System.out.println("listening on port 9199, resets the connection");
            try (Socket connected = listener.accept()) {
                connected.setSoLinger(true, 0);  // close() gửi RST: hủy kết nối, bỏ dữ liệu chưa gửi
                System.out.println("accepted client port " + connected.getPort() + ", closing with RST");
            }
        }
    }
}
