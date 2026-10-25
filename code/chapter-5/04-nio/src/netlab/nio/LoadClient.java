package netlab.nio;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.Socket;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * V33: tạo tải cho server tra cứu ở port 9199. Mở trước 5 000 kết nối và giữ mở; sau đó mỗi kết nối (một virtual thread phía
 * client) gửi 20 yêu cầu lần lượt, đo độ trễ từng yêu cầu. In thông lượng (yêu cầu mỗi giây) và độ trễ p50, p99.
 *
 * <p>Chạy: {@code java -cp out netlab.nio.LoadClient <nhãn server> [số kết nối] [số yêu cầu mỗi kết nối]}
 */
public final class LoadClient {

    public static void main(String[] args) throws Exception {
        String label = args.length > 0 ? args[0] : "server";
        int connections = args.length > 1 ? Integer.parseInt(args[1]) : 5000;
        int requests = args.length > 2 ? Integer.parseInt(args[2]) : 20;
        List<Socket> sockets = new ArrayList<>();
        for (int i = 0; i < connections; i++) {
            sockets.add(new Socket("127.0.0.1", 9199));  // mở đủ kết nối trước khi đo
        }
        long[] latency = new long[connections * requests];
        AtomicInteger errors = new AtomicInteger();
        long start = System.nanoTime();
        try (var clients = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < connections; i++) {
                int id = i;
                Socket socket = sockets.get(i);
                clients.submit(() -> {
                    var out = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), UTF_8));
                    var in = new BufferedReader(new InputStreamReader(socket.getInputStream(), UTF_8));
                    for (int r = 0; r < requests; r++) {
                        long begin = System.nanoTime();
                        out.write("hanoi\n");
                        out.flush();
                        String reply = in.readLine();
                        latency[id * requests + r] = System.nanoTime() - begin;  // độ trễ: gửi đến khi nhận đủ phản hồi
                        if (reply == null || !reply.startsWith("OK")) {
                            errors.incrementAndGet();
                        }
                    }
                    return null;
                });
            }
        }
        long elapsed = System.nanoTime() - start;
        for (Socket socket : sockets) {
            socket.close();
        }
        Arrays.sort(latency);
        System.out.printf("%-8s %,7d requests/s   p50 %5.1f ms   p99 %5.1f ms   %d errors%n",
                label, latency.length * 1_000_000_000L / elapsed,  // thông lượng: số yêu cầu mỗi giây
                latency[latency.length / 2] / 1e6, latency[latency.length * 99 / 100] / 1e6, errors.get());
    }
}
