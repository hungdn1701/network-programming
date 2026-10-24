package netlab.lookup;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.List;

/**
 * V10: client tra cứu. Mở một kết nối, gửi lần lượt các khóa (mặc định: bốn trường hợp thử của đặc tả, thêm khóa có
 * dấu), in mỗi phản hồi kèm thời gian chờ, rồi đóng kết nối.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.lookup.LookupClient [khóa…]}
 */
public final class LookupClient {

    public static void main(String[] args) throws IOException {
        List<String> keys = args.length > 0 ? List.of(args)
                : List.of("hanoi", "huế", "atlantis", "", "x".repeat(300));
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress("127.0.0.1", 9199), 3_000);  // connect timeout
            socket.setSoTimeout(10_000);  // read timeout: dài hơn read timeout 5 giây của server
            var out = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), UTF_8));
            var in = new BufferedReader(new InputStreamReader(socket.getInputStream(), UTF_8));
            for (String key : keys) {
                long start = System.nanoTime();
                out.write(key + "\n");
                out.flush();
                String reply = in.readLine();
                System.out.println(show(key) + " -> " + reply + " (" + (System.nanoTime() - start) / 1_000_000 + " ms)");
            }
        }  // đóng kết nối: server đọc được null và phục vụ kết nối sau
    }

    /** In khóa như NetCat ở V07: dòng rỗng và dòng dài được in rút gọn. */
    static String show(String key) {
        if (key.isEmpty()) {
            return "(empty line)";
        }
        int bytes = key.getBytes(UTF_8).length;
        return key.length() > 20 ? key.substring(0, 20) + "… (" + bytes + " bytes)" : key;
    }
}
