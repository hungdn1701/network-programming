package netlab.web;

import static java.nio.charset.StandardCharsets.US_ASCII;
import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.PrintStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * V10: web server tối giản, tuần tự — bài tập "Web Server" trong Kurose &amp; Ross, Computer Networking (Socket Programming
 * Assignment 1). Trả file tĩnh trong thư mục www/ cho request GET: 200 kèm file, 404 khi không có file, 400 khi request sai,
 * 501 với phương thức khác GET. Phục vụ lần lượt từng kết nối; trong một kết nối (HTTP/1.1 persistent connection), client gửi
 * nhiều request lần lượt. Client không gửi gì trong 5 giây thì server đóng kết nối và phục vụ kết nối sau.
 *
 * <p>Chạy (trong thư mục chứa www/): {@code java -cp out netlab.web.WebServer}
 */
public final class WebServer {

    private final ServerSocket listener;
    private final Path root;
    private final PrintStream log;

    WebServer(ServerSocket listener, Path root, PrintStream log) {
        this.listener = listener;
        this.root = root;
        this.log = log;
    }

    public static void main(String[] args) throws IOException {
        try (ServerSocket listener = new ServerSocket(9199)) {
            System.out.println("listening on port " + listener.getLocalPort() + ", serving www/");
            new WebServer(listener, Path.of("www"), System.out).serve();
        }
    }

    /** Vòng lặp server tuần tự: accept, phục vụ hết một kết nối, rồi mới accept kết nối sau. */
    void serve() {
        while (!listener.isClosed()) {
            try (Socket connected = listener.accept()) {  // một kết nối tại một thời điểm
                connected.setSoTimeout(5_000);  // read timeout: client không gửi gì quá 5 giây
                log.println("accepted " + fourTuple(connected));
                int requests = handle(connected);  // phục vụ đến khi client đóng kết nối
                log.println("closed, requests: " + requests);
            } catch (IOException e) {  // gồm cả SocketTimeoutException: lỗi của một kết nối không dừng server
                log.println("connection error: " + e.getMessage());
            }
        }
    }

    /** Một kết nối, nhiều request lần lượt: mỗi request gồm request line và header, kết thúc bằng một dòng trống. */
    int handle(Socket connected) throws IOException {
        var in = new BufferedReader(new InputStreamReader(connected.getInputStream(), US_ASCII));
        OutputStream out = new BufferedOutputStream(connected.getOutputStream());
        int requests = 0;
        for (String requestLine; (requestLine = in.readLine()) != null; requests++) {  // null: client đã đóng kết nối
            for (String header; (header = in.readLine()) != null && !header.isEmpty(); ) {
                // bỏ qua header; dòng trống kết thúc phần header
            }
            String status = respond(requestLine, out);
            out.flush();  // gửi response ngay, client đang chờ
            log.println("  " + requestLine + " -> " + status);
        }
        return requests;
    }

    /** Response cho một request line như "GET /index.html HTTP/1.1"; trả về status để ghi log. */
    String respond(String requestLine, OutputStream out) throws IOException {
        String[] parts = requestLine.split(" ");  // phương thức, đường dẫn, phiên bản
        if (parts.length != 3 || !parts[1].startsWith("/") || parts[1].contains("..")) {  // chặn đường dẫn ra ngoài www/
            return send(out, "400 Bad Request", "text/plain; charset=utf-8", "400 Bad Request\n".getBytes(UTF_8));
        }
        if (!parts[0].equals("GET")) {
            return send(out, "501 Not Implemented", "text/plain; charset=utf-8", "501 Not Implemented\n".getBytes(UTF_8));
        }
        String path = parts[1].equals("/") ? "/index.html" : parts[1];
        Path file = root.resolve(path.substring(1));  // đường dẫn trong thư mục www/
        if (!Files.isRegularFile(file)) {
            return send(out, "404 Not Found", "text/plain; charset=utf-8", "404 Not Found\n".getBytes(UTF_8));
        }
        return send(out, "200 OK", contentType(path), Files.readAllBytes(file));
    }

    /** Status line, header, dòng trống, rồi body; HTTP kết thúc mỗi dòng bằng CRLF. */
    static String send(OutputStream out, String status, String type, byte[] body) throws IOException {
        String head = "HTTP/1.1 " + status + "\r\n"
                + "Content-Type: " + type + "\r\n"
                + "Content-Length: " + body.length + "\r\n"  // client biết body dài bao nhiêu byte
                + "\r\n";
        out.write(head.getBytes(US_ASCII));
        out.write(body);
        return status;
    }

    static String contentType(String path) {
        if (path.endsWith(".html")) {
            return "text/html; charset=utf-8";
        }
        return path.endsWith(".txt") ? "text/plain; charset=utf-8" : "application/octet-stream";
    }

    /** 4-tuple của kết nối: địa chỉ và port của hai đầu. */
    static String fourTuple(Socket connected) {
        return "local " + connected.getLocalAddress().getHostAddress() + ":" + connected.getLocalPort()
                + ", remote " + connected.getInetAddress().getHostAddress() + ":" + connected.getPort();
    }
}
