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
import java.util.concurrent.atomic.AtomicLong;

/**
 * V25: Petstore dạng REST, bằng HttpServer của JDK — theo Swagger Petstore, ví dụ mẫu của đặc tả OpenAPI, giữ ba trường id,
 * name, status. Tài nguyên là tập /pet và từng con vật /pet/{petId}; phương thức HTTP là thao tác (POST thêm vào tập, GET đọc,
 * PUT thay, DELETE xóa); mã trạng thái HTTP báo kết quả; thân request và response là JSON. Server không giữ phiên: mỗi request
 * mang đủ thông tin (stateless).
 *
 * <p>Chạy: {@code java -cp out netlab.rest.RestServer}
 */
public final class RestServer {

    private static final Map<Long, Map<String, Object>> PETS = new ConcurrentHashMap<>();
    private static final AtomicLong NEXT_ID = new AtomicLong(11);
    private static final Map<String, String> NOT_FOUND = Map.of("message", "Pet not found");

    public static void main(String[] args) throws IOException {
        PETS.put(10L, pet(10, Map.of("name", "doggie", "status", "available")));
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 9199), 0);
        server.createContext("/pet", RestServer::handle);  // tập /pet và từng con vật /pet/{petId}
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        server.start();
        System.out.println("REST on http://127.0.0.1:9199/pet");
    }

    private static void handle(HttpExchange ex) throws IOException {
        try (ex) {
            try {
                route(ex, ex.getRequestURI().getPath(), ex.getRequestMethod());
            } catch (IllegalArgumentException e) {  // id không phải số, JSON sai hoặc thiếu name
                send(ex, 400, Map.of("message", "Invalid input"));
            }
        }
    }

    private static void route(HttpExchange ex, String path, String method) throws IOException {
        if (path.equals("/pet")) {  // tập con vật: chỉ nhận POST
            if (!method.equals("POST")) {
                notAllowed(ex, "POST");
                return;
            }
            Map<String, String> in = readInput(ex);
            long id = NEXT_ID.getAndIncrement();  // POST /pet: server cấp id, mỗi POST thêm một con vật mới
            PETS.put(id, pet(id, in));
            ex.getResponseHeaders().set("Location", "/pet/" + id);  // URI của tài nguyên vừa tạo
            send(ex, 201, PETS.get(id));
            return;
        }
        long id = Long.parseLong(path.substring("/pet/".length()));  // URI định danh tài nguyên
        switch (method) {  // phương thức HTTP là thao tác
            case "GET" -> {
                Map<String, Object> pet = PETS.get(id);
                if (pet == null) {
                    send(ex, 404, NOT_FOUND);
                } else {
                    send(ex, 200, pet);
                }
            }
            case "PUT" -> {
                Map<String, String> in = readInput(ex);
                if (PETS.replace(id, pet(id, in)) == null) {  // thay toàn bộ: gọi lại cho cùng trạng thái
                    send(ex, 404, NOT_FOUND);
                } else {
                    send(ex, 200, PETS.get(id));
                }
            }
            case "DELETE" -> {
                if (PETS.remove(id) == null) {
                    send(ex, 404, NOT_FOUND);
                } else {
                    ex.sendResponseHeaders(204, -1);  // 204 No Content: không có thân
                    log(ex, 204);
                }
            }
            default -> notAllowed(ex, "GET, PUT, DELETE");
        }
    }

    private static Map<String, String> readInput(HttpExchange ex) throws IOException {
        Map<String, String> in = Json.parseObject(new String(ex.getRequestBody().readAllBytes(), UTF_8));
        if (in.get("name") == null) {
            throw new IllegalArgumentException("missing name");
        }
        return in;
    }

    private static Map<String, Object> pet(long id, Map<String, String> in) {
        Map<String, Object> m = new LinkedHashMap<>();  // giữ thứ tự id, name, status trong JSON
        m.put("id", id);
        m.put("name", in.get("name"));
        m.put("status", in.getOrDefault("status", "available"));
        return m;
    }

    private static void notAllowed(HttpExchange ex, String allow) throws IOException {
        ex.getResponseHeaders().set("Allow", allow);
        send(ex, 405, Map.of("message", "Method not allowed"));
    }

    private static void send(HttpExchange ex, int status, Map<String, ?> body) throws IOException {
        byte[] bytes = Json.object(body).getBytes(UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json");
        ex.sendResponseHeaders(status, bytes.length);
        ex.getResponseBody().write(bytes);
        log(ex, status);
    }

    private static void log(HttpExchange ex, int status) {
        System.out.println(ex.getRequestMethod() + " " + ex.getRequestURI().getPath() + " -> " + status);
    }
}
