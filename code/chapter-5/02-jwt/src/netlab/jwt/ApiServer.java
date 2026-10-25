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
 * V31: API REST của dịch vụ tra cứu (như phần REST) có bảo vệ thao tác cập nhật. GET không cần token; PUT cần access token
 * dạng JWT trong header Authorization: Bearer, có chữ ký hợp lệ, chưa hết hạn và có scope entries:write.
 * Thiếu token hoặc token không hợp lệ: 401 (chưa xác thực). Token hợp lệ nhưng thiếu quyền: 403 (không được phép).
 */
final class ApiServer {

    private final Map<String, String> data = new ConcurrentHashMap<>(Map.of("hanoi", "Thủ đô của Việt Nam"));
    private final PublicKey authServerKey;
    private HttpServer server;

    ApiServer(PublicKey authServerKey) {
        this.authServerKey = authServerKey;
    }

    void start(int port) throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.createContext("/entries/", this::handle);
        server.start();
    }

    void stop() {
        server.stop(0);
    }

    private void handle(HttpExchange ex) throws IOException {
        String key = ex.getRequestURI().getPath().substring("/entries/".length());
        try (ex) {
            if (ex.getRequestMethod().equals("GET")) {
                String value = data.get(key);
                send(ex, value == null ? 404 : 200, value == null ? error("not found") : entry(key, value));
                return;
            }
            String auth = ex.getRequestHeaders().getFirst("Authorization");
            if (auth == null || !auth.startsWith("Bearer ")) {
                send(ex, 401, error("missing token"));  // chưa xác thực
                return;
            }
            Map<String, String> claims;
            try {
                claims = Jwt.verify(auth.substring("Bearer ".length()), authServerKey);  // xác thực: token có hợp lệ không
            } catch (Jwt.InvalidTokenException e) {
                send(ex, 401, error(e.getMessage()));
                return;
            }
            if (!Set.of(claims.get("scope").split(" ")).contains("entries:write")) {  // phân quyền: có được ghi không
                send(ex, 403, error("insufficient scope"));
                return;
            }
            Map<String, String> body = Json.parse(new String(ex.getRequestBody().readAllBytes(), UTF_8));
            data.put(key, body.get("value"));
            send(ex, 200, entry(key, body.get("value")));
        } catch (IllegalArgumentException e) {
            send(ex, 400, error("bad request"));
        }
    }

    private static Map<String, Object> entry(String key, String value) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("key", key);
        m.put("value", value);
        return m;
    }

    private static Map<String, Object> error(String message) {
        return Map.of("error", message);
    }

    private static void send(HttpExchange ex, int status, Map<String, Object> body) throws IOException {
        byte[] bytes = Json.object(body).getBytes(UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        if (status == 401) {
            ex.getResponseHeaders().set("WWW-Authenticate", "Bearer");
        }
        ex.sendResponseHeaders(status, bytes.length);
        ex.getResponseBody().write(bytes);
    }
}
