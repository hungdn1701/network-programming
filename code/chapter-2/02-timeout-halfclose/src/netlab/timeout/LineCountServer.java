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
 * V09: server đọc đến hết dữ liệu (readLine trả null khi client half-close), rồi mới trả một dòng: số dòng đã nhận.
 *
 * <p>Chạy ở terminal thứ nhất: {@code java -cp out netlab.timeout.LineCountServer}
 */
public final class LineCountServer {

    public static void main(String[] args) throws IOException {
        try (ServerSocket listener = new ServerSocket(9199)) {
            System.out.println("listening on port 9199");
            try (Socket connected = listener.accept()) {
                var in = new BufferedReader(new InputStreamReader(connected.getInputStream(), UTF_8));
                var out = new BufferedWriter(new OutputStreamWriter(connected.getOutputStream(), UTF_8));
                int count = 0;
                String line;
                while ((line = in.readLine()) != null) {  // null: client đã kết thúc chiều gửi
                    System.out.println("received: " + line);
                    count++;
                }
                System.out.println("readLine() returned null: client finished sending");
                out.write("lines: " + count + "\n");  // chiều gửi của server vẫn mở
                out.flush();
                System.out.println("sent: lines: " + count);
            }
        }
    }
}
