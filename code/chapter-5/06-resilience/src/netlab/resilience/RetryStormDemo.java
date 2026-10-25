package netlab.resilience;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.SplittableRandom;
import java.util.random.RandomGenerator;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;

/**
 * V35: 100 client cùng gọi khi server đang lỗi (lỗi từ lúc bắt đầu đến 1 400 ms), mỗi client retry đến khi thành công. Ba cách
 * retry: cố định mỗi 100 ms; exponential backoff (100, 200, 400, 800, tối đa 1 600 ms); exponential backoff có full jitter.
 * Mỗi dòng: tổng số request; số request dồn vào 100 ms đông nhất kể từ lúc server hồi phục; thời điểm client cuối cùng
 * nhận được 200.
 *
 * <p>Chạy: {@code java -cp out netlab.resilience.RetryStormDemo}
 */
public final class RetryStormDemo {

    enum Mode { FIXED, BACKOFF, JITTER }

    static final long DOWN_MILLIS = 1400;

    public static void main(String[] args) throws Exception {
        System.out.printf("%-15s%9s%31s%15s%n", "", "requests", "peak / 100 ms after recovery", "all OK after");
        FlakyServer server = FlakyServer.start(9199);
        HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
        runClients(http, null, null);  // khởi động: mỗi client một request khi server còn tốt, mở sẵn kết nối
        for (Mode mode : Mode.values()) {
            CountDownLatch go = new CountDownLatch(1);
            Thread starter = Thread.ofVirtual().start(() -> {
                try {
                    Thread.sleep(200);  // chờ đủ 100 client sẵn sàng
                } catch (InterruptedException ignored) {
                    return;
                }
                server.schedule(0, DOWN_MILLIS);  // từ đây: lỗi 1 400 ms
                go.countDown();
            });
            runClients(http, mode, go);
            starter.join();
            List<Long> afterRecovery = server.arrivals().stream().filter(t -> t >= DOWN_MILLIS).toList();
            System.out.printf("%-15s%9d%31d%12d ms%n", switch (mode) {
                case FIXED -> "fixed 100 ms";
                case BACKOFF -> "backoff";
                case JITTER -> "backoff+jitter";
            }, server.arrivals().size(), peak(afterRecovery, 100), server.lastOkMillis());
        }
        server.stop();
    }

    static void runClients(HttpClient http, Mode mode, CountDownLatch go) {
        try (var clients = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int c = 0; c < 100; c++) {
                RandomGenerator random = new SplittableRandom(c);  // seed theo client: chạy lại cho cùng chuỗi jitter
                clients.submit(() -> {
                    try {
                        if (go != null) {
                            go.await();  // 100 client bắt đầu cùng lúc
                        }
                        callUntilOk(http, mode, random);
                    } catch (Exception e) {
                        System.out.println("client error: " + e);
                    }
                });
            }
        }
    }

    static void callUntilOk(HttpClient http, Mode mode, RandomGenerator random) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:9199/entries/hanoi"))
                .timeout(Duration.ofSeconds(2)).build();
        for (int attempt = 0; ; attempt++) {
            if (http.send(request, HttpResponse.BodyHandlers.discarding()).statusCode() == 200) {
                return;
            }
            if (mode == null) {
                throw new IllegalStateException("warm-up request failed");
            }
            long wait = switch (mode) {
                case FIXED -> 100;                                            // gọi lại đều đặn
                case BACKOFF -> Backoff.delayMillis(attempt, 100, 1600, null);  // giãn dần
                case JITTER -> Backoff.delayMillis(attempt, 100, 1600, random); // giãn dần và rải ngẫu nhiên
            };
            Thread.sleep(wait);
        }
    }

    /** Số thời điểm nhiều nhất nằm trong một khoảng dài windowMillis. */
    static int peak(List<Long> times, long windowMillis) {
        List<Long> sorted = times.stream().sorted().toList();
        int best = 0;
        for (int i = 0, j = 0; i < sorted.size(); i++) {
            while (sorted.get(i) - sorted.get(j) >= windowMillis) {
                j++;
            }
            best = Math.max(best, i - j + 1);
        }
        return best;
    }
}
