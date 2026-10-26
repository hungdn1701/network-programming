package netlab.tls;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.ServerSocket;
import java.net.Socket;
import javax.net.ssl.SSLServerSocketFactory;

/**
 * V30: echo server theo dòng (RFC 862, như Chương 2), chạy dạng rõ hoặc qua TLS. Bản TLS chỉ khác ở cách tạo listening socket:
 * SSLServerSocketFactory dùng keystore (khóa riêng và chứng chỉ của server) đặt bằng thuộc tính hệ thống.
 *
 * <p>Chạy: {@code java -cp out netlab.tls.EchoServer plain|tls}
 */
public final class EchoServer {

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
        System.out.println((tls ? "TLS" : "plain") + " echo server on port 9199");
        try (listener) {
            while (true) {
                try (Socket s = listener.accept();
                     BufferedReader in = new BufferedReader(new InputStreamReader(s.getInputStream(), UTF_8));
                     PrintWriter out = new PrintWriter(s.getOutputStream(), true, UTF_8)) {
                    for (String line; (line = in.readLine()) != null; ) {  // với TLS, handshake diễn ra ở lần đọc đầu tiên
                        out.println(line);  // gửi lại đúng dòng nhận được
                    }
                } catch (Exception e) {
                    System.out.println("connection failed: " + e);
                }
            }
        }
    }
}
