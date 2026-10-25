package netlab.jwt;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse.BodyHandlers;
import java.time.Duration;
import java.time.Instant;

/**
 * V31: gọi PUT /entries/sapa của API với năm loại token. Authorization server và API chạy trong cùng tiến trình cho gọn; API
 * chỉ nhận khóa công khai. Token bị sửa: lấy token chỉ có entries:read, sửa payload thành có entries:write, giữ chữ ký cũ.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.jwt.JwtDemo}
 */
public final class JwtDemo {

    public static void main(String[] args) throws Exception {
        AuthorizationServer auth = new AuthorizationServer();
        ApiServer api = new ApiServer(auth.publicKey());  // API chỉ giữ khóa công khai
        api.start(9199);
        Instant now = Instant.now();
        String writer = auth.issue("alice", "entries:read entries:write", now, Duration.ofMinutes(5));
        String expired = auth.issue("alice", "entries:read entries:write", now.minusSeconds(600), Duration.ofMinutes(5));
        String reader = auth.issue("bob", "entries:read", now, Duration.ofMinutes(5));
        String[] p = reader.split("\\.");
        String forgedPayload = Jwt.decode(p[1]).replace("\"entries:read\"", "\"entries:read entries:write\"");
        String tampered = p[0] + "." + Jwt.encode(forgedPayload) + "." + p[2];  // sửa payload, giữ chữ ký cũ

        HttpClient client = HttpClient.newHttpClient();
        put(client, "no token", null);
        put(client, "valid token, entries:write", writer);
        put(client, "expired token", expired);
        put(client, "tampered payload", tampered);
        put(client, "valid token, entries:read only", reader);
        api.stop();
    }

    private static void put(HttpClient client, String label, String token) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create("http://127.0.0.1:9199/entries/sapa"))
                .PUT(BodyPublishers.ofString("{\"value\":\"Thị trấn vùng cao\"}"));
        if (token != null) {
            b.header("Authorization", "Bearer " + token);  // access token đi kèm mỗi request
        }
        var response = client.send(b.build(), BodyHandlers.ofString());
        System.out.printf("%-31s -> %d %s%n", label, response.statusCode(), response.body());
    }
}
