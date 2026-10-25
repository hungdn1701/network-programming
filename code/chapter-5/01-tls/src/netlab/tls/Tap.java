package netlab.tls;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.HexFormat;

/**
 * V30: một "máy trên đường truyền". Nhận kết nối ở port 9200, chuyển tiếp nguyên byte tới server ở port 9199 và theo chiều
 * ngược lại, đồng thời in những gì đi qua: dạng chữ nếu là văn bản, dạng hex (16 byte đầu) nếu không.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.tls.Tap}
 */
public final class Tap {

    public static void main(String[] args) throws Exception {
        try (ServerSocket listener = new ServerSocket(9200)) {
            System.out.println("tap on port 9200 -> 127.0.0.1:9199");
            while (true) {
                Socket client = listener.accept();
                Socket server = new Socket("127.0.0.1", 9199);
                Thread.ofVirtual().start(() -> pump(client, server, "client -> server"));
                Thread.ofVirtual().start(() -> pump(server, client, "server -> client"));
            }
        }
    }

    private static void pump(Socket from, Socket to, String direction) {
        byte[] buf = new byte[4096];
        try (InputStream in = from.getInputStream(); OutputStream out = to.getOutputStream()) {
            for (int n; (n = in.read(buf)) != -1; ) {
                System.out.println(direction + " " + n + " bytes: " + show(buf, n));
                out.write(buf, 0, n);  // chuyển tiếp nguyên vẹn
            }
        } catch (Exception ignored) {
            // một phía đóng kết nối
        } finally {
            close(from);
            close(to);
        }
    }

    private static String show(byte[] buf, int n) {
        String text = new String(buf, 0, n, UTF_8);
        boolean printable = text.chars().allMatch(c -> c == '\n' || c == '\r' || !Character.isISOControl(c))
                && text.indexOf(0xFFFD) < 0;  // không có ký tự thay thế: byte là UTF-8 hợp lệ
        if (printable) {
            return "\"" + text.replace("\r", "").replace("\n", "\\n") + "\"";
        }
        int shown = Math.min(n, 16);
        return HexFormat.ofDelimiter(" ").formatHex(buf, 0, shown) + (n > shown ? " ..." : "");
    }

    private static void close(Socket s) {
        try {
            s.close();
        } catch (Exception ignored) {
            // đã đóng
        }
    }
}
