package netlab.resilience;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * V35: cửa hàng trực tuyến gửi một thanh toán mỗi 400 ms qua circuit breaker (ngưỡng 3 lỗi liên tiếp, chờ 1 giây trước khi
 * thử lại). Dịch vụ thanh toán lỗi từ giây 1,0 đến giây 3,4. Mỗi dòng: thời điểm, trạng thái lúc gọi, kết quả (mã HTTP, hoặc rejected khi
 * breaker từ chối), trạng thái sau; cột cuối là
 * kết quả health check (GET /health) mà bộ cân bằng tải thấy cùng lúc.
 *
 * <p>Chạy: {@code java -cp out netlab.resilience.CircuitBreakerDemo}
 */
public final class CircuitBreakerDemo {

    public static void main(String[] args) throws Exception {
        PaymentService server = PaymentService.start(9199);
        HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(1)).build();
        get(http, "/health");  // khởi động kết nối trước khi tính giờ
        server.schedule(1000, 3400);
        CircuitBreaker breaker = new CircuitBreaker(3, 1000);
        int sent = 0;
        int rejected = 0;
        for (int tick = 1; tick <= 12; tick++) {
            Thread.sleep(Math.max(0, tick * 400L - server.elapsedMillis()));
            long now = server.elapsedMillis();
            String result;
            boolean allowed = breaker.allowRequest(now);
            CircuitBreaker.State at = breaker.state();  // trạng thái lúc gọi
            if (!allowed) {
                rejected++;
                result = "rejected";  // không gửi request: dịch vụ đang lỗi được nghỉ
            } else {
                sent++;
                int status = pay(http, "order-" + tick);
                if (status / 100 == 2) {
                    breaker.onSuccess();
                } else {
                    breaker.onFailure(now);
                }
                result = String.valueOf(status);
            }
            System.out.printf("%4.1f s  %-9s  %-8s -> %-9s  health %d%n",
                    now / 1000.0, at, result, breaker.state(), get(http, "/health"));
        }
        System.out.printf("12 calls: %d requests sent, %d rejected by the breaker%n", sent, rejected);
        server.stop();
    }

    static int pay(HttpClient http, String order) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:9199/payments"))
                .header("Idempotency-Key", order)
                .POST(HttpRequest.BodyPublishers.ofString("{\"order\":\"" + order + "\",\"amount\":250000}"))
                .timeout(Duration.ofSeconds(1)).build();
        return http.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
    }

    static int get(HttpClient http, String path) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:9199" + path))
                .timeout(Duration.ofSeconds(1)).build();
        return http.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
    }
}
