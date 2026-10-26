package netlab.concurrent;

import static java.nio.charset.StandardCharsets.US_ASCII;
import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/**
 * V14: web server đồng thời theo mô hình thread-per-connection — phần "multithreaded" của bài tập Web Server trong Kurose &amp;
 * Ross, nối tiếp web server tuần tự ở V10. Thread chạy serve() chỉ nhận kết nối; mỗi kết nối là một tác vụ giao cho executor
 * (pool 8 platform thread, hoặc mỗi kết nối một virtual thread). stop() dừng server theo ba bước: đóng listening socket,
 * shutdown executor và chờ có thời hạn, đóng các kết nối còn lại.
 *
 * <p>Chạy (trong thư mục chứa www/): {@code java -cp out netlab.concurrent.ConcurrentWebServer [pool|virtual]}
 * <br>Ctrl+C: shutdown hook gọi stop().
 */
public final class ConcurrentWebServer {

    private final ServerSocket listener;
    private final ExecutorService workers;
    private final Path root;
    private final Consumer<String> log;
    private final Set<Socket> open = ConcurrentHashMap.newKeySet();  // kết nối đang phục vụ, để đóng khi dừng
    private volatile boolean stopping = false;
    private int served = 0;  // thống kê dùng chung: số kết nối đã phục vụ xong

    ConcurrentWebServer(ServerSocket listener, ExecutorService workers, Path root, Consumer<String> log) {
        this.listener = listener;
        this.workers = workers;
        this.root = root;
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
        var server = new ConcurrentWebServer(listener, workers, Path.of("www"), log);
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

    /** Một kết nối, nhiều request lần lượt (như web server tuần tự ở V10). */
    int handle(Socket connected) throws IOException {
        var in = new BufferedReader(new InputStreamReader(connected.getInputStream(), US_ASCII));
        OutputStream out = new BufferedOutputStream(connected.getOutputStream());
        int requests = 0;
        for (String requestLine; (requestLine = in.readLine()) != null; requests++) {  // null: client đã đóng kết nối
            for (String header; (header = in.readLine()) != null && !header.isEmpty(); ) {
                // bỏ qua header; dòng trống kết thúc phần header
            }
            respond(requestLine, out);
            out.flush();
        }
        return requests;
    }

    /** Response cho một request line, như V10: 200, 404, 400, 501. */
    void respond(String requestLine, OutputStream out) throws IOException {
        String[] parts = requestLine.split(" ");
        if (parts.length != 3 || !parts[1].startsWith("/") || parts[1].contains("..")) {
            send(out, "400 Bad Request", "text/plain; charset=utf-8", "400 Bad Request\n".getBytes(UTF_8));
        } else if (!parts[0].equals("GET")) {
            send(out, "501 Not Implemented", "text/plain; charset=utf-8", "501 Not Implemented\n".getBytes(UTF_8));
        } else {
            String path = parts[1].equals("/") ? "/index.html" : parts[1];
            Path file = root.resolve(path.substring(1));
            if (Files.isRegularFile(file)) {
                send(out, "200 OK", contentType(path), Files.readAllBytes(file));
            } else {
                send(out, "404 Not Found", "text/plain; charset=utf-8", "404 Not Found\n".getBytes(UTF_8));
            }
        }
    }

    static void send(OutputStream out, String status, String type, byte[] body) throws IOException {
        String head = "HTTP/1.1 " + status + "\r\n"
                + "Content-Type: " + type + "\r\n"
                + "Content-Length: " + body.length + "\r\n"
                + "\r\n";
        out.write(head.getBytes(US_ASCII));
        out.write(body);
    }

    static String contentType(String path) {
        if (path.endsWith(".html")) {
            return "text/html; charset=utf-8";
        }
        return path.endsWith(".txt") ? "text/plain; charset=utf-8" : "application/octet-stream";
    }
}
