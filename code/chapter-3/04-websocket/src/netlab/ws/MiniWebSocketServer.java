package netlab.ws;

import static java.nio.charset.StandardCharsets.US_ASCII;
import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * V18: WebSocket server tối giản viết trên ServerSocket, để thấy handshake và frame: nhận request HTTP có header
 * {@code Upgrade: websocket}, trả {@code 101 Switching Protocols}, rồi trên cùng kết nối TCP đọc và ghi frame. Server
 * gửi "welcome" ngay sau handshake (client chưa gửi gì), trả lại mỗi frame text, trả pong cho ping, đáp lại close.
 * Một kết nối mỗi lần; chỉ để minh họa, không dùng cho ứng dụng thật (phần chat dùng thư viện).
 *
 * <p>Chạy: {@code java -cp out netlab.ws.MiniWebSocketServer}
 */
public final class MiniWebSocketServer {

    static final String GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";  // hằng số của RFC 6455

    public static void main(String[] args) throws IOException {
        try (ServerSocket listener = new ServerSocket(9400)) {
            System.out.println("WebSocket on port 9400");
            while (true) {
                try (Socket socket = listener.accept()) {
                    serve(socket);
                } catch (IOException e) {
                    System.out.println("connection ended: " + e.getMessage());
                }
            }
        }
    }

    static void serve(Socket socket) throws IOException {
        InputStream in = new BufferedInputStream(socket.getInputStream());
        OutputStream out = socket.getOutputStream();
        Map<String, String> headers = readRequestHeaders(in);
        String key = headers.get("sec-websocket-key");
        if (!"websocket".equalsIgnoreCase(headers.get("upgrade")) || key == null) {
            out.write("HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n".getBytes(US_ASCII));
            return;
        }
        String accept = Base64.getEncoder().encodeToString(sha1(key + GUID));  // chứng minh server hiểu WebSocket
        out.write(("HTTP/1.1 101 Switching Protocols\r\n"
                + "Upgrade: websocket\r\n"
                + "Connection: Upgrade\r\n"
                + "Sec-WebSocket-Accept: " + accept + "\r\n\r\n").getBytes(US_ASCII));
        System.out.println("101 Switching Protocols, Sec-WebSocket-Accept: " + accept);
        Frame.write(out, Frame.TEXT, "welcome".getBytes(UTF_8));  // từ đây là frame; server gửi trước, không cần request
        while (true) {
            Frame f = Frame.read(in);
            System.out.println("frame " + f);
            switch (f.opcode()) {
                case Frame.TEXT -> Frame.write(out, Frame.TEXT, ("echo: " + f.text()).getBytes(UTF_8));
                case Frame.PING -> Frame.write(out, Frame.PONG, f.payload());
                case Frame.CLOSE -> {
                    Frame.write(out, Frame.CLOSE, f.payload());  // đáp close rồi đóng kết nối TCP
                    return;
                }
                default -> { }
            }
        }
    }

    /** Đọc dòng request và các header tới dòng trống; khóa header viết thường. */
    static Map<String, String> readRequestHeaders(InputStream in) throws IOException {
        Map<String, String> headers = new HashMap<>();
        String requestLine = readLine(in);
        System.out.println("request: " + requestLine);
        for (String line = readLine(in); !line.isEmpty(); line = readLine(in)) {
            int colon = line.indexOf(':');
            if (colon > 0) {
                headers.put(line.substring(0, colon).trim().toLowerCase(), line.substring(colon + 1).trim());
            }
        }
        return headers;
    }

    /** Một dòng HTTP kết thúc bằng CRLF. Không dùng BufferedReader: sau header là byte của frame. */
    static String readLine(InputStream in) throws IOException {
        ByteArrayOutputStream line = new ByteArrayOutputStream();
        for (int b = in.read(); b != '\n'; b = in.read()) {
            if (b < 0) {
                throw new IOException("connection closed during handshake");
            }
            if (b != '\r') {
                line.write(b);
            }
        }
        return line.toString(US_ASCII);
    }

    static byte[] sha1(String s) {
        try {
            return MessageDigest.getInstance("SHA-1").digest(s.getBytes(US_ASCII));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
