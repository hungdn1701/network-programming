package netlab.concurrent;

import java.io.IOException;
import java.net.Socket;

/**
 * V14: client chậm (như V10). Kết nối tới web server nhưng không gửi request nào trong 8 giây.
 *
 * <p>Chạy: {@code java -cp out netlab.concurrent.IdleClient}
 */
public final class IdleClient {

    public static void main(String[] args) throws IOException, InterruptedException {
        try (Socket socket = new Socket("127.0.0.1", 9199)) {
            System.out.println("connected from port " + socket.getLocalPort() + ", sending nothing");
            Thread.sleep(8_000);
        }
    }
}
