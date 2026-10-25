package netlab.rest;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import java.util.Map;

/**
 * V25: client REST bằng HttpClient của JDK. Mỗi lời gọi chọn phương thức HTTP và URI của tài nguyên, rồi đọc mã trạng thái
 * trước khi đọc thân JSON. PUT và DELETE gọi hai lần để thấy tính idempotency.
 *
 * <p>Chạy (server đang chạy): {@code java -Dstdout.encoding=UTF-8 -cp out netlab.rest.RestClient}
 */
public final class RestClient {

    private static final String BASE = "http://127.0.0.1:9199/entries/";
    private static final HttpClient CLIENT = HttpClient.newHttpClient();

    public static void main(String[] args) throws Exception {
        call("GET", "hanoi", null);
        call("GET", "atlantis", null);
        String body = Json.object(Map.of("value", "Thị trấn vùng cao"));
        call("PUT", "sapa", body);
        call("PUT", "sapa", body);  // gọi lại: cùng trạng thái
        call("DELETE", "sapa", null);
        call("DELETE", "sapa", null);  // gọi lại: trạng thái vẫn là không có sapa
        call("POST", "sapa", body);
    }

    static void call(String method, String key, String json) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(BASE + key))
                .method(method, json == null ? BodyPublishers.noBody() : BodyPublishers.ofString(json))
                .header("Content-Type", "application/json")
                .build();
        HttpResponse<String> response = CLIENT.send(request, BodyHandlers.ofString());
        int status = response.statusCode();  // đọc mã trạng thái trước, rồi mới đọc thân
        System.out.printf("%-6s /entries/%-8s -> %d %s%n", method, key, status, response.body());
    }
}
