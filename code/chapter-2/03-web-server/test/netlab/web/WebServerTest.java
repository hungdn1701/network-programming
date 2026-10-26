package netlab.web;

import static java.nio.charset.StandardCharsets.US_ASCII;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.PrintStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.file.Path;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;

/**
 * V10: integration test của web server. Server thật chạy trên loopback ở port 0: hệ điều hành cấp một ephemeral port còn trống,
 * test đọc lại số port rồi kết nối như một client thật, gửi request HTTP và kiểm status line của response.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)  // chạy theo thứ tự khai báo, cho dễ đọc kết quả
class WebServerTest {

    static final PrintStream NO_LOG = new PrintStream(OutputStream.nullOutputStream());  // test không cần log của server
    static ServerSocket listener;

    @BeforeAll
    static void startServer() throws IOException {
        listener = new ServerSocket(0, 50, InetAddress.getLoopbackAddress());  // port 0: hệ điều hành cấp port trống
        Thread server = new Thread(() -> new WebServer(listener, Path.of("www"), NO_LOG).serve());
        server.setDaemon(true);
        server.start();  // server chạy song song với test; thread học ở nhóm đa luồng
    }

    @AfterAll
    static void stopServer() throws IOException {
        listener.close();
    }

    /** Gửi một request line kèm dòng trống kết thúc header, trả về status line của response. */
    static String statusLine(String requestLine) throws IOException {
        try (Socket socket = new Socket(listener.getInetAddress(), listener.getLocalPort())) {  // port đã được cấp
            socket.setSoTimeout(2_000);
            socket.getOutputStream().write((requestLine + "\r\n\r\n").getBytes(US_ASCII));
            var in = new BufferedReader(new InputStreamReader(socket.getInputStream(), US_ASCII));
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
    void existingFile() throws IOException {
        assertEquals("HTTP/1.1 200 OK", statusLine("GET /hello.txt HTTP/1.1"));
    }

    @Test
    @Order(3)
    void rootServesIndex() throws IOException {
        assertEquals("HTTP/1.1 200 OK", statusLine("GET / HTTP/1.1"));
    }

    @Test
    @Order(4)
    void missingFile() throws IOException {
        assertEquals("HTTP/1.1 404 Not Found", statusLine("GET /nothing.html HTTP/1.1"));
    }

    @Test
    @Order(5)
    void pathOutsideRoot() throws IOException {
        assertEquals("HTTP/1.1 400 Bad Request", statusLine("GET /../README.md HTTP/1.1"));
    }

    @Test
    @Order(6)
    void otherMethod() throws IOException {
        assertEquals("HTTP/1.1 501 Not Implemented", statusLine("POST /hello.txt HTTP/1.1"));
    }
}
