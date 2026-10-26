package netlab.jwt;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse.BodyHandlers;
import java.time.Duration;
import java.time.Instant;

/**
 * V31: gọi PUT /pet/10 của Petstore với năm loại token, để đổi status của con vật thành sold. Authorization server và API chạy
 * trong cùng tiến trình cho gọn; API chỉ nhận khóa công khai. Token bị sửa: lấy token chỉ có read:pets, sửa payload thành có
 * thêm write:pets, giữ chữ ký cũ.
 *
 * <p>Chạy: {@code java -cp out netlab.jwt.JwtDemo}
 */
public final class JwtDemo {

    public static void main(String[] args) throws Exception {
        AuthorizationServer auth = new AuthorizationServer();
        ApiServer api = new ApiServer(auth.publicKey());  // API chỉ giữ khóa công khai
        api.start(9199);
        Instant now = Instant.now();
        String writer = auth.issue("alice", "read:pets write:pets", now, Duration.ofMinutes(5));
        String expired = auth.issue("alice", "read:pets write:pets", now.minusSeconds(600), Duration.ofMinutes(5));
        String reader = auth.issue("bob", "read:pets", now, Duration.ofMinutes(5));
        String[] p = reader.split("\\.");
        String forgedPayload = Jwt.decode(p[1]).replace("\"read:pets\"", "\"read:pets write:pets\"");
        String tampered = p[0] + "." + Jwt.encode(forgedPayload) + "." + p[2];  // sửa payload, giữ chữ ký cũ

        HttpClient client = HttpClient.newHttpClient();
        put(client, "no token", null);
        put(client, "valid token, write:pets", writer);
        put(client, "expired token", expired);
        put(client, "tampered payload", tampered);
        put(client, "valid token, read:pets only", reader);
        api.stop();
    }

    private static void put(HttpClient client, String label, String token) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create("http://127.0.0.1:9199/pet/10"))
                .PUT(BodyPublishers.ofString("{\"name\":\"doggie\",\"status\":\"sold\"}"));
        if (token != null) {
            b.header("Authorization", "Bearer " + token);  // access token đi kèm mỗi request
        }
        var response = client.send(b.build(), BodyHandlers.ofString());
        System.out.printf("%-28s -> %d %s%n", label, response.statusCode(), response.body());
    }
}
