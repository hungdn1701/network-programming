package netlab.h2;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;

/**
 * V20: tải 20 tài nguyên song song từ ResourceServer bằng HttpClient của JDK, với HTTP/2 hoặc ép HTTP/1.1. Với HTTP/1.1,
 * mặc định giới hạn 6 request đồng thời, như trình duyệt giới hạn số kết nối tới một server; với HTTP/2, cả 20 request
 * gửi cùng lúc. Đối số thứ hai (không bắt buộc) đặt giới hạn khác. In thời gian, phiên bản giao thức của response, và số
 * kết nối server đếm được.
 *
 * <p>Chạy: {@code java -cp out netlab.h2.ParallelFetch 2}, {@code ... ParallelFetch 1.1}, {@code ... ParallelFetch 1.1 20}
 */
public final class ParallelFetch {

    public static void main(String[] args) throws Exception {
        boolean http11 = args.length > 0 && args[0].equals("1.1");
        HttpClient client = HttpClient.newBuilder()
                .version(http11 ? HttpClient.Version.HTTP_1_1 : HttpClient.Version.HTTP_2)
                .build();
        get(client, "/warmup");                    // request đầu: với h2c, kết nối được nâng cấp lên HTTP/2 ở đây
        get(client, "/reset");
        int limit = args.length > 1 ? Integer.parseInt(args[1]) : http11 ? 6 : 20;
        Semaphore slots = new Semaphore(limit);    // HTTP/1.1: mặc định 6 request cùng lúc, như trình duyệt
        Set<HttpClient.Version> versions = ConcurrentHashMap.newKeySet();
        long start = System.nanoTime();
        try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 1; i <= 20; i++) {
                String path = "/r" + i;
                pool.submit(() -> {
                    slots.acquire();
                    try {
                        versions.add(get(client, path).version());
                    } finally {
                        slots.release();
                    }
                    return null;
                });
            }
        }                                          // đóng executor: chờ cả 20 request xong
        long ms = (System.nanoTime() - start) / 1_000_000;
        System.out.printf("%s, at most %d at a time: 20 requests in %d ms, response version %s%n",
                http11 ? "HTTP/1.1" : "HTTP/2", limit, ms, versions);
        System.out.println("server: " + get(client, "/stats").body());
    }

    static HttpResponse<String> get(HttpClient client, String path) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:9402" + path)).build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }
}
