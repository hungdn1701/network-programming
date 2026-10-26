package netlab.rest;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;

/**
 * V25: client REST bằng HttpClient của JDK, gọi Petstore. Mỗi lời gọi chọn phương thức HTTP và URI của tài nguyên, rồi đọc mã
 * trạng thái trước khi đọc thân JSON. POST, PUT và DELETE gọi hai lần để thấy phương thức nào idempotent.
 *
 * <p>Chạy (server đang chạy): {@code java -cp out netlab.rest.RestClient}
 */
public final class RestClient {

    private static final String BASE = "http://127.0.0.1:9199";
    private static final HttpClient CLIENT = HttpClient.newHttpClient();

    public static void main(String[] args) throws Exception {
        call("GET", "/pet/10", null);
        call("GET", "/pet/99", null);
        call("GET", "/pet/abc", null);
        String kitty = "{\"name\":\"kitty\"}";
        call("POST", "/pet", kitty);
        call("POST", "/pet", kitty);  // gọi lại: thêm một con vật nữa
        String sold = "{\"name\":\"kitty\",\"status\":\"sold\"}";
        call("PUT", "/pet/11", sold);
        call("PUT", "/pet/11", sold);  // gọi lại: cùng trạng thái
        call("DELETE", "/pet/12", null);
        call("DELETE", "/pet/12", null);  // gọi lại: vẫn là không có con vật 12
        call("PATCH", "/pet/11", sold);
    }

    static void call(String method, String path, String json) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(BASE + path))
                .method(method, json == null ? BodyPublishers.noBody() : BodyPublishers.ofString(json))
                .header("Content-Type", "application/json")
                .build();
        HttpResponse<String> response = CLIENT.send(request, BodyHandlers.ofString());
        int status = response.statusCode();  // đọc mã trạng thái trước, rồi mới đọc thân
        System.out.printf("%-6s %-8s -> %d %s%n", method, path, status, response.body());
    }
}
