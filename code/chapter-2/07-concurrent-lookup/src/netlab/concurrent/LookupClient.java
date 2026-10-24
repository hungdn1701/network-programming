package netlab.concurrent;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.InetSocketAddress;
import java.net.Socket;

/**
 * V14: client tra cứu (như V10). Gửi lần lượt các khóa trên một kết nối, in phản hồi kèm thời gian chờ.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.concurrent.LookupClient hanoi}
 */
public final class LookupClient {

    public static void main(String[] args) throws IOException {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress("127.0.0.1", 9199), 3_000);
            socket.setSoTimeout(10_000);
            var out = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), UTF_8));
            var in = new BufferedReader(new InputStreamReader(socket.getInputStream(), UTF_8));
            for (String key : args) {
                long start = System.nanoTime();
                out.write(key + "\n");
                out.flush();
                String reply = in.readLine();
                System.out.println(key + " -> " + reply + " (" + (System.nanoTime() - start) / 1_000_000 + " ms)");
            }
        }
    }
}
