package netlab.timeout;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.ServerSocket;
import java.net.Socket;

/**
 * V09: echo server đọc đến hết dữ liệu: gửi lại từng dòng, và khi readLine trả null (client đã half-close) thì đóng kết nối,
 * như str_echo trong Stevens, Unix Network Programming, chương 5.
 *
 * <p>Chạy ở terminal thứ nhất: {@code java -cp out netlab.timeout.BatchEchoServer}
 */
public final class BatchEchoServer {

    public static void main(String[] args) throws IOException {
        try (ServerSocket listener = new ServerSocket(9199)) {
            System.out.println("listening on port 9199");
            try (Socket connected = listener.accept()) {
                var in = new BufferedReader(new InputStreamReader(connected.getInputStream(), UTF_8));
                var out = new BufferedWriter(new OutputStreamWriter(connected.getOutputStream(), UTF_8));
                String line;
                while ((line = in.readLine()) != null) {  // null: client đã kết thúc chiều gửi
                    out.write(line + "\n");
                    out.flush();
                    System.out.println("echoed: " + line);
                }
                System.out.println("readLine() returned null: client finished sending, closing");
            }
        }
    }
}
