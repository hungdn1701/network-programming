package netlab.chat;

import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.glassfish.tyrus.server.Server;

/**
 * V19: chạy ChatEndpoint trên server WebSocket của Tyrus (bản cài đặt tham chiếu của Jakarta WebSocket, chạy trên
 * Grizzly). Đối số: số giây chạy (không bắt buộc; mặc định chạy đến khi dừng bằng Ctrl+C).
 *
 * <p>Chạy: {@code java -cp "out;lib/*" netlab.chat.ChatServer}
 */
public final class ChatServer {

    public static void main(String[] args) throws Exception {
        Logger.getLogger("").setLevel(Level.WARNING);  // ẩn log INFO của thư viện, chỉ giữ cảnh báo và lỗi
        Server server = new Server("localhost", 9401, "/", Map.of(), ChatEndpoint.class);
        server.start();                                // endpoint ở ws://localhost:9401/chat
        try {
            if (args.length > 0) {
                Thread.sleep(Long.parseLong(args[0]) * 1_000);
            } else {
                new CountDownLatch(1).await();
            }
        } finally {
            server.stop();
        }
    }
}
