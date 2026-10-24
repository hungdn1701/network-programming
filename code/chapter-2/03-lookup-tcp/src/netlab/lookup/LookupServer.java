package netlab.lookup;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.Map;

/**
 * V10: server tra cứu tuần tự theo đặc tả giao thức tra cứu, bản 1 ({@code PROTOCOL.md} của V07). Phục vụ lần lượt
 * từng kết nối; trong một kết nối, client gửi nhiều yêu cầu lần lượt. Client không gửi gì trong 5 giây thì server
 * đóng kết nối và phục vụ kết nối sau.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.lookup.LookupServer}
 */
public final class LookupServer {

    static final int MAX_LINE_BYTES = 256;
    private static final Map<String, String> DATA = Map.of(
            "hanoi", "Thủ đô của Việt Nam",
            "huế", "Cố đô triều Nguyễn");

    private final ServerSocket listener;
    private final PrintStream log;

    LookupServer(ServerSocket listener, PrintStream log) {
        this.listener = listener;
        this.log = log;
    }

    public static void main(String[] args) throws IOException {
        try (ServerSocket listener = new ServerSocket(9199)) {
            System.out.println("listening on port " + listener.getLocalPort());
            new LookupServer(listener, System.out).serve();
        }
    }

    /** Vòng lặp server tuần tự: accept, phục vụ hết một kết nối, rồi mới accept kết nối sau. */
    void serve() {
        while (!listener.isClosed()) {
            try (Socket connected = listener.accept()) {  // một kết nối tại một thời điểm
                connected.setSoTimeout(5_000);  // read timeout: client không gửi gì quá 5 giây
                log.println("accepted " + fourTuple(connected));
                int requests = handle(connected);  // phục vụ đến khi client đóng chiều gửi
                log.println("closed, requests: " + requests);
            } catch (IOException e) {  // gồm cả SocketTimeoutException: lỗi của một kết nối không dừng server
                log.println("connection error: " + e.getMessage());
            }
        }
    }

    /** Một kết nối, nhiều yêu cầu lần lượt: mỗi dòng nhận được là một khóa, trả đúng một dòng. */
    int handle(Socket connected) throws IOException {
        var in = new BufferedReader(new InputStreamReader(connected.getInputStream(), UTF_8));
        var out = new BufferedWriter(new OutputStreamWriter(connected.getOutputStream(), UTF_8));
        int requests = 0;
        for (String key; (key = in.readLine()) != null; requests++) {  // null: client đã đóng chiều gửi
            out.write(reply(key) + "\n");  // OK <giá trị>, NOTFOUND hoặc ERR <lý do>
            out.flush();
        }
        return requests;
    }

    /** Ba dạng phản hồi và hai mã lỗi của đặc tả. readLine() đã bỏ LF, và cả CR nếu client gửi CRLF. */
    static String reply(String key) {
        if (key.isEmpty()) {
            return "ERR empty key";
        }
        if (key.getBytes(UTF_8).length > MAX_LINE_BYTES) {
            return "ERR line too long";
        }
        String value = DATA.get(key);
        return value != null ? "OK " + value : "NOTFOUND";
    }

    /** 4-tuple của kết nối: địa chỉ và port của hai đầu. */
    static String fourTuple(Socket connected) {
        return "local " + connected.getLocalAddress().getHostAddress() + ":" + connected.getLocalPort()
                + ", remote " + connected.getInetAddress().getHostAddress() + ":" + connected.getPort();
    }
}
