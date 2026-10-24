package netlab.timeout;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.ArrayList;
import java.util.List;

/**
 * V09: server nhận kết nối nhưng không đọc, không trả lời. Client phía kia chỉ thoát khỏi read nhờ read timeout.
 *
 * <p>Chạy ở terminal thứ nhất: {@code java -cp out netlab.timeout.SilentServer}
 */
public final class SilentServer {

    public static void main(String[] args) throws IOException {
        List<Socket> held = new ArrayList<>();  // giữ các kết nối mở, không đọc, không ghi
        try (ServerSocket listener = new ServerSocket(9199)) {
            System.out.println("listening on port 9199, never replies");
            while (true) {
                Socket connected = listener.accept();
                held.add(connected);
                System.out.println("accepted client port " + connected.getPort() + ", not replying");
            }
        }
    }
}
