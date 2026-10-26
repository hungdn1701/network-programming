package netlab.jwt;

import static java.nio.charset.StandardCharsets.UTF_8;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.security.PublicKey;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * V31: Petstore của phần REST (/pet/{petId}, ba trường id, name, status) có bảo vệ thao tác ghi, theo đặc tả OpenAPI của
 * Swagger Petstore: scope read:pets để đọc, write:pets để sửa. GET không cần token; PUT cần access token dạng JWT trong header
 * Authorization: Bearer, có chữ ký hợp lệ, chưa hết hạn và có scope write:pets.
 * Thiếu token hoặc token không hợp lệ: 401 (chưa xác thực). Token hợp lệ nhưng thiếu quyền: 403 (không được phép).
 */
final class ApiServer {

    private final Map<Long, Map<String, Object>> pets = new ConcurrentHashMap<>(Map.of(10L, pet(10, "doggie", "available")));
    private final PublicKey authServerKey;
    private HttpServer server;

    ApiServer(PublicKey authServerKey) {
        this.authServerKey = authServerKey;
    }

    void start(int port) throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.createContext("/pet/", this::handle);
        server.start();
    }

    void stop() {
        server.stop(0);
    }

    private void handle(HttpExchange ex) throws IOException {
        try (ex) {
            long id = Long.parseLong(ex.getRequestURI().getPath().substring("/pet/".length()));
            if (ex.getRequestMethod().equals("GET")) {
                Map<String, Object> pet = pets.get(id);
                send(ex, pet == null ? 404 : 200, pet == null ? message("Pet not found") : pet);
                return;
            }
            String auth = ex.getRequestHeaders().getFirst("Authorization");
            if (auth == null || !auth.startsWith("Bearer ")) {
                send(ex, 401, message("missing token"));  // chưa xác thực
                return;
            }
            Map<String, String> claims;
            try {
                claims = Jwt.verify(auth.substring("Bearer ".length()), authServerKey);  // xác thực: token có hợp lệ không
            } catch (Jwt.InvalidTokenException e) {
                send(ex, 401, message(e.getMessage()));
                return;
            }
            if (!Set.of(claims.get("scope").split(" ")).contains("write:pets")) {  // phân quyền: có được sửa không
                send(ex, 403, message("insufficient scope"));
                return;
            }
            Map<String, String> body = Json.parse(new String(ex.getRequestBody().readAllBytes(), UTF_8));
            if (pets.replace(id, pet(id, body.get("name"), body.get("status"))) == null) {
                send(ex, 404, message("Pet not found"));
            } else {
                send(ex, 200, pets.get(id));
            }
        } catch (IllegalArgumentException e) {  // id không phải số, JSON sai
            send(ex, 400, message("Invalid input"));
        }
    }

    private static Map<String, Object> pet(long id, String name, String status) {
        Map<String, Object> m = new LinkedHashMap<>();  // giữ thứ tự id, name, status trong JSON
        m.put("id", id);
        m.put("name", name);
        m.put("status", status);
        return m;
    }

    private static Map<String, Object> message(String text) {
        return Map.of("message", text);
    }

    private static void send(HttpExchange ex, int status, Map<String, Object> body) throws IOException {
        byte[] bytes = Json.object(body).getBytes(UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json");
        if (status == 401) {
            ex.getResponseHeaders().set("WWW-Authenticate", "Bearer");
        }
        ex.sendResponseHeaders(status, bytes.length);
        ex.getResponseBody().write(bytes);
    }
}
