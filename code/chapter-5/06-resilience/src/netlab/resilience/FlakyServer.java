package netlab.resilience;

import static java.nio.charset.StandardCharsets.UTF_8;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.Executors;

/**
 * V35: dịch vụ tra cứu REST (như V25, chỉ GET) có một khoảng thời gian không hoạt động được, như khi kho dữ liệu phía sau
 * bị lỗi: trong khoảng đó /entries/{key} trả 503, và /health trả 503 {"status":"DOWN"}; ngoài khoảng đó /health trả 200
 * {"status":"UP"}. Server ghi thời điểm đến (mili giây kể từ lần gọi schedule) của mọi request tra cứu, và thời điểm trả
 * 200 cuối cùng.
 */
final class FlakyServer {

    private static final Map<String, String> DATA = Map.of(
            "hanoi", "Thủ đô của Việt Nam",
            "huế", "Cố đô triều Nguyễn");

    private final HttpServer http;
    private volatile long mark = System.nanoTime();
    private volatile long downFrom;
    private volatile long downUntil;
    private final ConcurrentLinkedQueue<Long> arrivals = new ConcurrentLinkedQueue<>();
    private volatile long lastOk;

    private FlakyServer(int port) throws IOException {
        http = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 1024);
        http.createContext("/entries/", this::lookup);
        http.createContext("/health", this::health);
        http.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
    }

    /** Server chạy, chưa lỗi. */
    static FlakyServer start(int port) throws IOException {
        FlakyServer s = new FlakyServer(port);
        s.http.start();
        return s;
    }

    /** Đặt mốc thời gian 0 tại lúc gọi, xóa danh sách thời điểm đến; server lỗi trong [downFromMillis, downUntilMillis). */
    void schedule(long downFromMillis, long downUntilMillis) {
        downFrom = downFromMillis;
        downUntil = downUntilMillis;
        arrivals.clear();
        lastOk = 0;
        mark = System.nanoTime();
    }

    long elapsedMillis() {
        return (System.nanoTime() - mark) / 1_000_000;
    }

    boolean down() {
        long t = elapsedMillis();
        return t >= downFrom && t < downUntil;
    }

    List<Long> arrivals() {
        return List.copyOf(arrivals);
    }

    long lastOkMillis() {
        return lastOk;
    }

    void stop() {
        http.stop(0);
    }

    private void lookup(HttpExchange ex) throws IOException {
        long t = elapsedMillis();
        arrivals.add(t);
        try (ex) {
            if (down()) {
                send(ex, 503, "{\"error\":\"lookup store unavailable\"}");
                return;
            }
            String value = DATA.get(ex.getRequestURI().getPath().substring("/entries/".length()));
            send(ex, value != null ? 200 : 404, value != null ? "{\"value\":\"" + value + "\"}" : "{\"error\":\"not found\"}");
            lastOk = Math.max(lastOk, elapsedMillis());
        }
    }

    private void health(HttpExchange ex) throws IOException {
        try (ex) {
            boolean up = !down();  // kiểm tra cả phần phụ thuộc (ở đây: kho dữ liệu)
            send(ex, up ? 200 : 503, up ? "{\"status\":\"UP\"}" : "{\"status\":\"DOWN\"}");
        }
    }

    private static void send(HttpExchange ex, int status, String json) throws IOException {
        byte[] body = json.getBytes(UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        ex.sendResponseHeaders(status, body.length);
        ex.getResponseBody().write(body);
    }
}
