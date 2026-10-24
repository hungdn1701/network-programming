package netlab.lookup;

import java.io.IOException;
import java.net.Socket;

/**
 * V10: client chậm. Kết nối tới server tra cứu nhưng không gửi dòng nào trong 8 giây. Server tuần tự bị chặn ở
 * readLine của kết nối này đến khi read timeout 5 giây hết hạn; các client khác phải chờ.
 *
 * <p>Chạy: {@code java -cp out netlab.lookup.IdleClient}
 */
public final class IdleClient {

    public static void main(String[] args) throws IOException, InterruptedException {
        try (Socket socket = new Socket("127.0.0.1", 9199)) {
            System.out.println("connected from port " + socket.getLocalPort() + ", sending nothing");
            Thread.sleep(8_000);
        }
    }
}
