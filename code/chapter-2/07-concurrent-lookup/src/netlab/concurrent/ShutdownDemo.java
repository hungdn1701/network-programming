package netlab.concurrent;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

/**
 * V14: dừng server khi còn kết nối đang mở. Một client gửi một yêu cầu rồi giữ kết nối, không gửi thêm. Sau 1 giây,
 * stop() chạy ba bước: đóng listening socket (vòng accept kết thúc), chờ tối đa 2 giây, rồi đóng kết nối còn lại;
 * client đọc được null. Log của server và client in chung, kèm thời điểm.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.concurrent.ShutdownDemo}
 */
public final class ShutdownDemo {

    public static void main(String[] args) throws Exception {
        long start = System.nanoTime();
        Consumer<String> log = message -> System.out.printf("%5d ms  %s%n", (System.nanoTime() - start) / 1_000_000, message);
        var server = new ConcurrentLookupServer(new ServerSocket(9199), Executors.newVirtualThreadPerTaskExecutor(),
                message -> log.accept("server: " + message));
        Thread acceptLoop = Thread.ofPlatform().name("accept-loop").start(server::serve);
        try (Socket socket = new Socket("127.0.0.1", 9199)) {
            var out = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), UTF_8));
            var in = new BufferedReader(new InputStreamReader(socket.getInputStream(), UTF_8));
            out.write("hanoi\n");
            out.flush();
            log.accept("client: hanoi -> " + in.readLine());
            Thread.ofPlatform().name("stopper").start(() -> {
                sleep(1_000);
                server.stopQuietly(2_000);  // dừng server khi kết nối này vẫn đang mở
            });
            log.accept("client: readLine() -> " + in.readLine() + " (server closed the connection)");
        }
        acceptLoop.join();
    }

    static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
