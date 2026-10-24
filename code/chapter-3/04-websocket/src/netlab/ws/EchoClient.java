package netlab.ws;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * V18: client WebSocket bằng API của JDK ({@code java.net.http.WebSocket}). Nhận "welcome" do server gửi trước, gửi một
 * frame text và một ping, rồi đóng bằng frame close.
 *
 * <p>Chạy: {@code java -cp out netlab.ws.EchoClient} (khi MiniWebSocketServer đang chạy)
 */
public final class EchoClient {

    public static void main(String[] args) throws Exception {
        CountDownLatch replies = new CountDownLatch(3);       // welcome, echo, pong
        CompletableFuture<Integer> closed = new CompletableFuture<>();
        WebSocket ws = HttpClient.newHttpClient().newWebSocketBuilder()
                .buildAsync(URI.create("ws://127.0.0.1:9400/chat"), new WebSocket.Listener() {
                    @Override
                    public CompletionStage<?> onText(WebSocket w, CharSequence data, boolean last) {
                        System.out.println("text: " + data);
                        replies.countDown();
                        w.request(1);                         // sẵn sàng nhận message tiếp theo
                        return null;
                    }

                    @Override
                    public CompletionStage<?> onPong(WebSocket w, ByteBuffer message) {
                        System.out.println("pong: " + UTF_8.decode(message));
                        replies.countDown();
                        w.request(1);
                        return null;
                    }

                    @Override
                    public CompletionStage<?> onClose(WebSocket w, int statusCode, String reason) {
                        closed.complete(statusCode);
                        return null;
                    }
                }).join();                                    // handshake xong: kết nối đã nâng cấp
        System.out.println("connected");
        ws.sendText("hello", true).join();
        ws.sendPing(ByteBuffer.wrap("still there?".getBytes(UTF_8))).join();
        replies.await(2, TimeUnit.SECONDS);
        ws.sendClose(WebSocket.NORMAL_CLOSURE, "bye").join();
        System.out.println("closed with code " + closed.get(2, TimeUnit.SECONDS));
    }
}
