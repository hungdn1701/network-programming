package netlab.rest;

import static java.nio.charset.StandardCharsets.UTF_8;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;

/**
 * V25: dịch vụ tra cứu dạng REST, bằng HttpServer của JDK. Tài nguyên là mục /entries/{key}; phương thức HTTP là thao tác
 * (GET tra cứu, PUT tạo hoặc thay, DELETE xóa); mã trạng thái HTTP báo kết quả; thân request và response là JSON.
 * Server không giữ phiên: mỗi request mang đủ thông tin (stateless).
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.rest.RestServer}
 */
public final class RestServer {

    private static final Map<String, String> DATA = new ConcurrentHashMap<>(Map.of(
            "hanoi", "Thủ đô của Việt Nam",
            "huế", "Cố đô triều Nguyễn"));

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 9199), 0);
        server.createContext("/entries/", RestServer::handle);  // mọi URI bắt đầu bằng /entries/
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        server.start();
        System.out.println("REST on http://127.0.0.1:9199/entries/{key}");
    }

    private static void handle(HttpExchange ex) throws IOException {
        String key = ex.getRequestURI().getPath().substring("/entries/".length());  // URI định danh tài nguyên
        try (ex) {
            if (key.isEmpty() || key.contains("/")) {
                send(ex, 400, Map.of("error", "bad key"));
                return;
            }
            switch (ex.getRequestMethod()) {  // phương thức HTTP là thao tác
                case "GET" -> {
                    String value = DATA.get(key);
                    if (value == null) {
                        send(ex, 404, Map.of("error", "not found"));
                    } else {
                        send(ex, 200, entry(key, value));
                    }
                }
                case "PUT" -> {
                    String value = Json.parseObject(new String(ex.getRequestBody().readAllBytes(), UTF_8)).get("value");
                    if (value == null) {
                        send(ex, 400, Map.of("error", "missing value"));
                        return;
                    }
                    boolean created = DATA.put(key, value) == null;  // ghi đè: gọi lại cho cùng trạng thái
                    send(ex, created ? 201 : 200, entry(key, value));
                }
                case "DELETE" -> {
                    if (DATA.remove(key) == null) {
                        send(ex, 404, Map.of("error", "not found"));
                    } else {
                        ex.sendResponseHeaders(204, -1);  // 204 No Content: không có thân
                        log(ex, 204);
                    }
                }
                default -> {
                    ex.getResponseHeaders().set("Allow", "GET, PUT, DELETE");
                    send(ex, 405, Map.of("error", "method not allowed"));
                }
            }
        } catch (IllegalArgumentException e) {  // thân không phải JSON hợp lệ
            send(ex, 400, Map.of("error", "bad json"));
        }
    }

    private static Map<String, String> entry(String key, String value) {
        Map<String, String> m = new LinkedHashMap<>();  // giữ thứ tự key, value trong JSON
        m.put("key", key);
        m.put("value", value);
        return m;
    }

    private static void send(HttpExchange ex, int status, Map<String, String> body) throws IOException {
        byte[] bytes = Json.object(body).getBytes(UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        ex.sendResponseHeaders(status, bytes.length);
        ex.getResponseBody().write(bytes);
        log(ex, status);
    }

    private static void log(HttpExchange ex, int status) {
        System.out.println(ex.getRequestMethod() + " " + ex.getRequestURI().getPath() + " -> " + status);
    }
}
