package netlab.concurrent;

import static java.nio.charset.StandardCharsets.US_ASCII;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.file.Path;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

/**
 * V14: dừng server khi còn kết nối đang mở. Một client gửi một request rồi giữ kết nối (persistent connection), không gửi thêm.
 * Sau 1 giây, stop() chạy ba bước: đóng listening socket (vòng accept kết thúc), chờ tối đa 2 giây, rồi đóng kết nối còn lại;
 * client đọc được null. Log của server và client in chung, kèm thời điểm.
 *
 * <p>Chạy (trong thư mục chứa www/): {@code java -cp out netlab.concurrent.ShutdownDemo}
 */
public final class ShutdownDemo {

    public static void main(String[] args) throws Exception {
        long start = System.nanoTime();
        Consumer<String> log = message -> System.out.printf("%5d ms  %s%n", (System.nanoTime() - start) / 1_000_000, message);
        var server = new ConcurrentWebServer(new ServerSocket(9199), Executors.newVirtualThreadPerTaskExecutor(),
                Path.of("www"), message -> log.accept("server: " + message));
        Thread acceptLoop = Thread.ofPlatform().name("accept-loop").start(server::serve);
        try (Socket socket = new Socket("127.0.0.1", 9199)) {
            socket.getOutputStream().write("GET /hello.txt HTTP/1.1\r\n\r\n".getBytes(US_ASCII));
            var in = new BufferedReader(new InputStreamReader(socket.getInputStream(), US_ASCII));
            String status = in.readLine();
            for (String header; !(header = in.readLine()).isEmpty(); ) {
                // bỏ qua header của response
            }
            log.accept("client: GET /hello.txt -> " + status + ", body " + in.readLine());
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
