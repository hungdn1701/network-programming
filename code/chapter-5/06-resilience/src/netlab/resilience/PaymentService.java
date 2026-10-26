package netlab.resilience;

import static java.nio.charset.StandardCharsets.UTF_8;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * V35: dịch vụ thanh toán phía sau mà cửa hàng trực tuyến gọi tới (POST /payments), có một khoảng thời gian không hoạt động
 * được, như khi hệ thống ngân hàng phía sau bị lỗi: trong khoảng đó /payments trả 503, và /health trả 503 {"status":"DOWN"};
 * ngoài khoảng đó /health trả 200 {"status":"UP"}. Thanh toán không idempotent, nên mỗi request mang header Idempotency-Key
 * (như nhóm RPC ở Chương 4): key đã thấy thì trả lại khoản thanh toán cũ, không tạo khoản mới. Server ghi thời điểm đến
 * (mili giây kể từ lần gọi schedule) của mọi request thanh toán, thời điểm trả thành công cuối cùng, và số khoản đã tạo.
 */
final class PaymentService {

    private final HttpServer http;
    private volatile long mark = System.nanoTime();
    private volatile long downFrom;
    private volatile long downUntil;
    private final ConcurrentLinkedQueue<Long> arrivals = new ConcurrentLinkedQueue<>();
    private final Map<String, String> payments = new ConcurrentHashMap<>();  // idempotency key → mã khoản thanh toán
    private final AtomicInteger nextPayment = new AtomicInteger(1);
    private volatile long lastOk;

    private PaymentService(int port) throws IOException {
        http = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 1024);
        http.createContext("/payments", this::pay);
        http.createContext("/health", this::health);
        http.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
    }

    /** Dịch vụ chạy, chưa lỗi. */
    static PaymentService start(int port) throws IOException {
        PaymentService s = new PaymentService(port);
        s.http.start();
        return s;
    }

    /** Đặt mốc thời gian 0 tại lúc gọi, xóa số liệu đã ghi; dịch vụ lỗi trong [downFromMillis, downUntilMillis). */
    void schedule(long downFromMillis, long downUntilMillis) {
        downFrom = downFromMillis;
        downUntil = downUntilMillis;
        arrivals.clear();
        payments.clear();
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

    int paymentsCreated() {
        return payments.size();
    }

    void stop() {
        http.stop(0);
    }

    private void pay(HttpExchange ex) throws IOException {
        long t = elapsedMillis();
        arrivals.add(t);
        try (ex) {
            ex.getRequestBody().readAllBytes();  // đơn hàng và số tiền: ví dụ không cần đọc
            if (down()) {
                send(ex, 503, "{\"error\":\"bank unavailable\"}");
                return;
            }
            String key = ex.getRequestHeaders().getFirst("Idempotency-Key");
            if (key == null) {
                send(ex, 400, "{\"error\":\"missing Idempotency-Key\"}");
                return;
            }
            boolean[] created = {false};
            String id = payments.computeIfAbsent(key, k -> {  // key đã thấy: trả lại khoản cũ, không trừ tiền lần nữa
                created[0] = true;
                return "pay-" + nextPayment.getAndIncrement();
            });
            send(ex, created[0] ? 201 : 200, "{\"payment\":\"" + id + "\",\"status\":\"captured\"}");
            lastOk = Math.max(lastOk, elapsedMillis());
        }
    }

    private void health(HttpExchange ex) throws IOException {
        try (ex) {
            boolean up = !down();  // kiểm tra cả phần phụ thuộc (ở đây: hệ thống ngân hàng phía sau)
            send(ex, up ? 200 : 503, up ? "{\"status\":\"UP\"}" : "{\"status\":\"DOWN\"}");
        }
    }

    private static void send(HttpExchange ex, int status, String json) throws IOException {
        byte[] body = json.getBytes(UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json");
        ex.sendResponseHeaders(status, body.length);
        ex.getResponseBody().write(body);
    }
}
