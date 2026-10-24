package netlab.lookup;

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;

/**
 * V10: integration test của server tra cứu. Server thật chạy trên loopback ở port 0: hệ điều hành cấp một ephemeral
 * port còn trống, test đọc lại số port rồi kết nối như một client thật. Các trường hợp thử lấy từ đặc tả (V07).
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)  // chạy theo thứ tự của đặc tả, cho dễ đọc kết quả
class LookupServerTest {

    static final PrintStream NO_LOG = new PrintStream(OutputStream.nullOutputStream());  // test không cần log của server
    static ServerSocket listener;

    @BeforeAll
    static void startServer() throws IOException {
        listener = new ServerSocket(0, 50, InetAddress.getLoopbackAddress());  // port 0: hệ điều hành cấp port trống
        Thread server = new Thread(() -> new LookupServer(listener, NO_LOG).serve());
        server.setDaemon(true);
        server.start();  // server chạy song song với test; thread học ở nhóm đa luồng
    }

    @AfterAll
    static void stopServer() throws IOException {
        listener.close();
    }

    static String ask(String key) throws IOException {
        try (Socket socket = new Socket(listener.getInetAddress(), listener.getLocalPort())) {  // port đã được cấp
            socket.setSoTimeout(2_000);
            var out = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), UTF_8));
            var in = new BufferedReader(new InputStreamReader(socket.getInputStream(), UTF_8));
            out.write(key + "\n");
            out.flush();
            return in.readLine();
        }
    }

    @Test
    @Order(1)
    void portZeroGetsEphemeralPort() {
        assertNotEquals(0, listener.getLocalPort());
    }

    @Test
    @Order(2)
    void knownKey() throws IOException {
        assertEquals("OK Thủ đô của Việt Nam", ask("hanoi"));
    }

    @Test
    @Order(3)
    void unknownKey() throws IOException {
        assertEquals("NOTFOUND", ask("atlantis"));
    }

    @Test
    @Order(4)
    void emptyLine() throws IOException {
        assertEquals("ERR empty key", ask(""));
    }

    @Test
    @Order(5)
    void lineLongerThan256Bytes() throws IOException {
        assertEquals("ERR line too long", ask("x".repeat(300)));
    }

    @Test
    @Order(6)
    void crlfIsAccepted() throws IOException {
        assertEquals("OK Cố đô triều Nguyễn", ask("huế\r"));  // ask thêm LF: client gửi "huế" + CRLF
    }
}
