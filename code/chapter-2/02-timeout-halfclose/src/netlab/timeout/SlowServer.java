package netlab.timeout;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;

/**
 * V09: echo server rất chậm, gửi lại dòng nhận được mỗi giây một byte. Mỗi lần read của client chờ chưa tới 2 giây nên
 * read timeout 2 giây không bao giờ hết hạn, dù cả dòng mất nhiều giây.
 *
 * <p>Chạy ở terminal thứ nhất: {@code java -cp out netlab.timeout.SlowServer}
 */
public final class SlowServer {

    public static void main(String[] args) throws IOException, InterruptedException {
        try (ServerSocket listener = new ServerSocket(9199)) {
            System.out.println("listening on port 9199, echoes one byte per second");
            try (Socket connected = listener.accept()) {
                var in = new BufferedReader(new InputStreamReader(connected.getInputStream(), UTF_8));
                String line = in.readLine();
                System.out.println("received: " + line);
                OutputStream out = connected.getOutputStream();
                for (byte b : (line + "\n").getBytes(UTF_8)) {
                    out.write(b);  // ghi thẳng xuống socket: mỗi byte đi riêng
                    Thread.sleep(1_000);
                }
                System.out.println("echo sent");
            }
        }
    }
}
