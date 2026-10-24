package netlab.timeout;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.InetSocketAddress;
import java.net.Socket;

/**
 * V09: client tra cứu có connect timeout và read timeout. Gửi một khóa tới port 9199 của từng host, in phản hồi
 * hoặc loại lỗi (tên lớp ngoại lệ, thông báo) kèm thời gian đã chờ.
 *
 * <p>Chạy: {@code java -cp out netlab.timeout.TimeoutDemo 127.0.0.1 192.0.2.1}
 * <br>192.0.2.1 thuộc dải dành cho tài liệu (RFC 5737): không máy nào trả lời, gói SYN không có phản hồi.
 */
public final class TimeoutDemo {

    public static void main(String[] args) {
        for (String host : args.length > 0 ? args : new String[] {"127.0.0.1", "192.0.2.1"}) {
            lookup(host, "hanoi");
        }
    }

    static void lookup(String host, String key) {
        long start = System.nanoTime();
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, 9199), 3_000);  // connect timeout: 3 giây
            socket.setSoTimeout(2_000);  // read timeout: mỗi lần read chờ tối đa 2 giây
            socket.getOutputStream().write((key + "\n").getBytes(UTF_8));  // gửi yêu cầu
            var in = new BufferedReader(new InputStreamReader(socket.getInputStream(), UTF_8));
            String reply = in.readLine();  // chờ phản hồi
            System.out.println(host + ": reply \"" + reply + "\" after " + millis(start) + " ms");
        } catch (IOException e) {  // loại lỗi: tên lớp ngoại lệ và thông báo
            System.out.println(host + ": " + e.getClass().getSimpleName() + ": " + e.getMessage()
                    + " after " + millis(start) + " ms");
        }
    }

    static long millis(long start) {
        return (System.nanoTime() - start) / 1_000_000;
    }
}
