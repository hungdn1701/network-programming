package netlab.concurrent;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/**
 * V14: server tra cứu đồng thời theo mô hình thread-per-connection. Thread chạy serve() chỉ nhận kết nối; mỗi kết nối
 * là một tác vụ giao cho executor (pool 8 platform thread, hoặc mỗi kết nối một virtual thread). stop() dừng server
 * theo ba bước: đóng listening socket, shutdown executor và chờ có thời hạn, đóng các kết nối còn lại.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.concurrent.ConcurrentLookupServer [pool|virtual]}
 * <br>Ctrl+C: shutdown hook gọi stop().
 */
public final class ConcurrentLookupServer {

    static final int MAX_LINE_BYTES = 256;
    private static final Map<String, String> DATA = Map.of(
            "hanoi", "Thủ đô của Việt Nam",
            "huế", "Cố đô triều Nguyễn");

    private final ServerSocket listener;
    private final ExecutorService workers;
    private final Consumer<String> log;
    private final Set<Socket> open = ConcurrentHashMap.newKeySet();  // kết nối đang phục vụ, để đóng khi dừng
    private volatile boolean stopping = false;
    private int served = 0;  // thống kê dùng chung: số kết nối đã phục vụ xong

    ConcurrentLookupServer(ServerSocket listener, ExecutorService workers, Consumer<String> log) {
        this.listener = listener;
        this.workers = workers;
        this.log = log;
    }

    public static void main(String[] args) throws IOException {
        boolean virtual = args.length > 0 && args[0].equals("virtual");
        ExecutorService workers = virtual
                ? Executors.newVirtualThreadPerTaskExecutor()        // mỗi kết nối một virtual thread
                : new ThreadPoolExecutor(8, 8, 0, TimeUnit.SECONDS,  // 8 platform thread
                        new ArrayBlockingQueue<>(200), new ThreadPoolExecutor.CallerRunsPolicy());
        ServerSocket listener = new ServerSocket(9199, 200);  // backlog 200: đủ cho bài tạo tải
        long start = System.nanoTime();
        Consumer<String> log = message -> System.out.printf("%6d ms  %s%n", (System.nanoTime() - start) / 1_000_000, message);
        var server = new ConcurrentLookupServer(listener, workers, log);
        Runtime.getRuntime().addShutdownHook(new Thread(() -> server.stopQuietly(2_000)));  // Ctrl+C: dừng có trật tự
        log.accept("listening on port 9199 with " + (virtual ? "virtual threads" : "a pool of 8 threads"));
        server.serve();
    }

    /** Vòng accept: chỉ nhận kết nối, giao mỗi kết nối cho executor. */
    void serve() {
        while (!stopping) {
            try {
                Socket connected = listener.accept();
                workers.execute(() -> serveConnection(connected));  // thread-per-connection: mỗi kết nối một tác vụ
            } catch (IOException e) {  // đóng listening socket để dừng server cũng làm accept() ném SocketException
                log.accept((stopping ? "stopping, accept loop ends: " : "accept error: ") + e.getMessage());
            }
        }
    }

    /** Tác vụ của một kết nối: chạy trên một thread của executor từ đầu đến cuối kết nối. */
    void serveConnection(Socket connected) {
        open.add(connected);
        String remote = "remote port " + connected.getPort();
        try (connected) {
            connected.setSoTimeout(5_000);  // vẫn cần read timeout: client không gửi gì vẫn giữ kết nối
            log.accept("accepted " + remote);
            int requests = handle(connected);
            log.accept("closed " + remote + ", requests: " + requests);
        } catch (IOException e) {
            log.accept("connection error, " + remote + ": " + e.getMessage());
        } finally {
            open.remove(connected);
            synchronized (this) {  // critical section ngắn: chỉ tăng bộ đếm, không có I/O
                served++;
            }
        }
    }

    /** Graceful shutdown ba bước. */
    void stop(long graceMillis) throws IOException, InterruptedException {
        stopping = true;
        listener.close();  // 1. ngừng nhận kết nối mới: accept() đang chờ ném SocketException
        log.accept("stop 1/3: listening socket closed");
        workers.shutdown();  // 2. không nhận tác vụ mới; chờ các kết nối đang phục vụ, có thời hạn
        log.accept("stop 2/3: waiting up to " + graceMillis + " ms for " + open.size() + " open connection(s)");
        if (!workers.awaitTermination(graceMillis, TimeUnit.MILLISECONDS)) {
            log.accept("stop 3/3: closing " + open.size() + " remaining connection(s)");
            for (Socket socket : open) {
                socket.close();  // 3. đóng kết nối còn lại: read() đang chờ ném SocketException
            }
        }
        workers.awaitTermination(1, TimeUnit.SECONDS);
        int total;
        synchronized (this) {
            total = served;
        }
        log.accept("stopped, connections served: " + total);
    }

    void stopQuietly(long graceMillis) {
        try {
            stop(graceMillis);
        } catch (IOException | InterruptedException e) {
            log.accept("stop error: " + e.getMessage());
        }
    }

    /** Một kết nối, nhiều yêu cầu lần lượt (như server tuần tự ở V10). */
    static int handle(Socket connected) throws IOException {
        var in = new BufferedReader(new InputStreamReader(connected.getInputStream(), UTF_8));
        var out = new BufferedWriter(new OutputStreamWriter(connected.getOutputStream(), UTF_8));
        int requests = 0;
        for (String key; (key = in.readLine()) != null; requests++) {  // null: client đã đóng chiều gửi
            out.write(reply(key) + "\n");
            out.flush();
        }
        return requests;
    }

    static String reply(String key) {
        if (key.isEmpty()) {
            return "ERR empty key";
        }
        if (key.getBytes(UTF_8).length > MAX_LINE_BYTES) {
            return "ERR line too long";
        }
        String value = DATA.get(key);
        return value != null ? "OK " + value : "NOTFOUND";
    }
}
