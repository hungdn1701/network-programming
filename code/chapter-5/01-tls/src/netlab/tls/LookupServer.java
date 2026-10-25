package netlab.tls;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.Map;
import javax.net.ssl.SSLServerSocketFactory;

/**
 * V30: dịch vụ tra cứu theo dòng (giao thức của Chương 2), chạy dạng rõ hoặc qua TLS. Bản TLS chỉ khác ở cách tạo listening
 * socket: SSLServerSocketFactory dùng keystore (khóa riêng và chứng chỉ của server) đặt bằng thuộc tính hệ thống.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.tls.LookupServer plain|tls}
 */
public final class LookupServer {

    private static final Map<String, String> DATA = Map.of(
            "hanoi", "Thủ đô của Việt Nam",
            "huế", "Cố đô triều Nguyễn");

    public static void main(String[] args) throws Exception {
        boolean tls = args.length > 0 && args[0].equals("tls");
        ServerSocket listener;
        if (tls) {
            System.setProperty("javax.net.ssl.keyStore", "server.p12");  // khóa riêng và chứng chỉ của server
            System.setProperty("javax.net.ssl.keyStorePassword", "changeit");
            listener = SSLServerSocketFactory.getDefault().createServerSocket(9199);  // listening socket TLS
        } else {
            listener = new ServerSocket(9199);
        }
        System.out.println((tls ? "TLS" : "plain") + " lookup on port 9199");
        try (listener) {
            while (true) {
                try (Socket s = listener.accept();
                     BufferedReader in = new BufferedReader(new InputStreamReader(s.getInputStream(), UTF_8));
                     PrintWriter out = new PrintWriter(s.getOutputStream(), true, UTF_8)) {
                    String key = in.readLine();  // với TLS, handshake diễn ra ở lần đọc ghi đầu tiên
                    if (key != null) {
                        String value = DATA.get(key);
                        out.println(value != null ? "OK " + value : "NOTFOUND");
                    }
                } catch (Exception e) {
                    System.out.println("connection failed: " + e);
                }
            }
        }
    }
}
