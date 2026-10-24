package netlab.h3;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import tech.kwik.core.Statistics;
import tech.kwik.flupke.Http3Client;

/**
 * V21: gửi một request HTTP/3 qua QUIC bằng Flupke (client HTTP/3 viết bằng Java, chạy trên thư viện QUIC Kwik).
 * HttpClient của JDK 21 chưa hỗ trợ HTTP/3 (JDK 26 mới bổ sung, JEP 517). In status và thống kê của kết nối QUIC: số
 * UDP datagram đã gửi, số gói bị mất (QUIC tự gửi lại), RTT. Đối số: URL (mặc định https://cloudflare-quic.com/).
 *
 * <p>Chạy: {@code java -cp "out;lib/*" netlab.h3.Http3Get}
 */
public final class Http3Get {

    public static void main(String[] args) throws Exception {
        URI uri = URI.create(args.length > 0 ? args[0] : "https://cloudflare-quic.com/");
        HttpClient client = Http3Client.newHttpClient();     // cùng API HttpClient, bên dưới là QUIC trên UDP
        HttpResponse<String> response = client.send(HttpRequest.newBuilder(uri).build(),
                HttpResponse.BodyHandlers.ofString());
        System.out.printf("%s over HTTP/3: status %d, %d bytes%n", uri, response.statusCode(), response.body().length());
        Statistics stats = ((Http3Client) client).getConnectionStatistics();
        System.out.printf("QUIC: %d UDP datagrams sent, %d packets lost (resent by QUIC), smoothed RTT %d ms%n",
                stats.datagramsSent(), stats.lostPackets(), stats.smoothedRtt());
    }
}
