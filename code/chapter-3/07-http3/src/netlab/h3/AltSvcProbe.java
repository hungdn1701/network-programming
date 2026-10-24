package netlab.h3;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

/**
 * V21: hỏi một server công khai bằng HttpClient của JDK 21 (HTTPS; HTTP/2 được chọn bằng ALPN trong handshake TLS), rồi
 * in header Alt-Svc: server báo có HTTP/3 ở port UDP nào. Đối số: URL (mặc định https://cloudflare-quic.com/).
 *
 * <p>Chạy: {@code java -cp out netlab.h3.AltSvcProbe}
 */
public final class AltSvcProbe {

    public static void main(String[] args) throws Exception {
        URI uri = URI.create(args.length > 0 ? args[0] : "https://cloudflare-quic.com/");
        HttpClient client = HttpClient.newHttpClient();       // mặc định ưu tiên HTTP/2
        HttpResponse<String> response = client.send(HttpRequest.newBuilder(uri).build(),
                HttpResponse.BodyHandlers.ofString());
        System.out.printf("%s: status %d, version %s%n", uri, response.statusCode(), response.version());
        System.out.println("alt-svc: " + response.headers().firstValue("alt-svc").orElse("(none)"));  // h3 = HTTP/3
    }
}
