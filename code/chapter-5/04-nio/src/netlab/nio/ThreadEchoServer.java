package netlab.nio;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * V33: echo server thread-per-connection để so sánh với NioEchoServer: mỗi kết nối một platform thread, hoặc mỗi
 * kết nối một virtual thread (như V14 nhưng không giới hạn số thread). Mã xử lý kết nối là I/O chặn, đọc theo dòng.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.nio.ThreadEchoServer [platform|virtual]}
 */
public final class ThreadEchoServer {

    private static final AtomicInteger OPEN = new AtomicInteger();

    public static void main(String[] args) throws IOException {
        String mode = args.length > 0 ? args[0] : "platform";
        ExecutorService workers = mode.equals("virtual")
                ? Executors.newVirtualThreadPerTaskExecutor()                    // mỗi kết nối một virtual thread
                : Executors.newThreadPerTaskExecutor(Thread.ofPlatform().factory());  // mỗi kết nối một platform thread
        try (ServerSocket listener = new ServerSocket(9199, 1024)) {
            Stats.report(mode, 0);
            while (true) {
                Socket connected = listener.accept();
                int n = OPEN.incrementAndGet();
                workers.execute(() -> serve(connected));
                if (n % 1000 == 0) {
                    Stats.report(mode, n);
                }
            }
        }
    }

    static void serve(Socket connected) {
        try (connected) {
            var in = new BufferedReader(new InputStreamReader(connected.getInputStream(), UTF_8));
            var out = new BufferedWriter(new OutputStreamWriter(connected.getOutputStream(), UTF_8));
            for (String line; (line = in.readLine()) != null; ) {  // readLine() chặn đến khi đủ một dòng
                out.write(line + "\n");  // gửi lại đúng dòng nhận được
                out.flush();
            }
        } catch (IOException e) {
            // kết nối lỗi: đóng kết nối này
        } finally {
            OPEN.decrementAndGet();
        }
    }
}
