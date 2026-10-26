package netlab.concurrent;

import static java.nio.charset.StandardCharsets.US_ASCII;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.Socket;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * V14: tạo tải. 200 client cùng lúc, mỗi client gửi một request GET, đọc status line, rồi giữ kết nối thêm 1 giây trước khi
 * đóng (như trình duyệt giữ persistent connection). Mỗi kết nối vì vậy giữ một tác vụ của server khoảng 1 giây, phần lớn là
 * chờ I/O.
 *
 * <p>Chạy: {@code java -cp out netlab.concurrent.LoadClient pool} (đối số: nhãn cấu hình server, không bắt buộc)
 */
public final class LoadClient {

    public static void main(String[] args) throws InterruptedException {
        int connections = 200;
        AtomicInteger ok = new AtomicInteger();
        AtomicLong slowest = new AtomicLong();
        long start = System.nanoTime();
        try (var clients = Executors.newVirtualThreadPerTaskExecutor()) {  // mỗi client giả lập một virtual thread
            for (int i = 0; i < connections; i++) {
                clients.submit(() -> {
                    long begin = System.nanoTime();
                    try (Socket socket = new Socket("127.0.0.1", 9199)) {
                        socket.setSoTimeout(60_000);
                        socket.getOutputStream().write("GET /hello.txt HTTP/1.1\r\n\r\n".getBytes(US_ASCII));
                        var in = new BufferedReader(new InputStreamReader(socket.getInputStream(), US_ASCII));
                        String status = in.readLine();
                        slowest.accumulateAndGet((System.nanoTime() - begin) / 1_000_000, Math::max);
                        if ("HTTP/1.1 200 OK".equals(status)) {
                            ok.incrementAndGet();
                        }
                        Thread.sleep(1_000);  // giữ kết nối 1 giây rồi mới đóng
                    }
                    return null;
                });
            }
        }
        String server = args.length > 0 ? args[0] + ": " : "";  // nhãn cấu hình server, khi chạy nhiều lần liền nhau
        System.out.printf("%s%d connections, %d responses 200 OK, slowest response after %d ms, all done in %d ms%n",
                server, connections, ok.get(), slowest.get(), (System.nanoTime() - start) / 1_000_000);
    }
}
