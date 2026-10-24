package netlab.concurrent;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.Socket;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * V14: tạo tải. 200 client cùng lúc, mỗi client gửi một khóa, nhận phản hồi, rồi giữ kết nối thêm 1 giây trước khi đóng
 * (như người dùng đọc kết quả). Mỗi kết nối vì vậy giữ một tác vụ của server khoảng 1 giây, phần lớn là chờ I/O.
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
                        var out = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), UTF_8));
                        var in = new BufferedReader(new InputStreamReader(socket.getInputStream(), UTF_8));
                        out.write("hanoi\n");
                        out.flush();
                        String reply = in.readLine();
                        slowest.accumulateAndGet((System.nanoTime() - begin) / 1_000_000, Math::max);
                        if (reply != null && reply.startsWith("OK")) {
                            ok.incrementAndGet();
                        }
                        Thread.sleep(1_000);  // giữ kết nối 1 giây rồi mới đóng
                    }
                    return null;
                });
            }
        }
        String server = args.length > 0 ? args[0] + ": " : "";  // nhãn cấu hình server, khi chạy nhiều lần liền nhau
        System.out.printf("%s%d connections, %d OK replies, slowest reply after %d ms, all done in %d ms%n",
                server, connections, ok.get(), slowest.get(), (System.nanoTime() - start) / 1_000_000);
    }
}
