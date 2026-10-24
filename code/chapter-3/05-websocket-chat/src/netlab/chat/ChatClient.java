package netlab.chat;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.util.concurrent.CompletionStage;

/**
 * V19: client chat bằng API WebSocket của JDK. Mỗi dòng gõ vào (stdin) là một tin; hết stdin (Ctrl+Z trên Windows,
 * Ctrl+D trên Linux) thì gửi frame close. Tin nhận được in ra màn hình.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.chat.ChatClient an}
 */
public final class ChatClient {

    public static void main(String[] args) throws Exception {
        String name = args.length > 0 ? args[0] : "guest";
        WebSocket ws = HttpClient.newHttpClient().newWebSocketBuilder()
                .buildAsync(URI.create("ws://localhost:9401/chat?name=" + name), new WebSocket.Listener() {
                    @Override
                    public CompletionStage<?> onText(WebSocket w, CharSequence data, boolean last) {
                        System.out.println(data);              // tin do server gửi tới bất cứ lúc nào
                        w.request(1);
                        return null;
                    }
                }).join();
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in, UTF_8));
        for (String line = in.readLine(); line != null; line = in.readLine()) {
            ws.sendText(line, true).join();
        }
        ws.sendClose(WebSocket.NORMAL_CLOSURE, "bye").join();
        Thread.sleep(300);                                     // chờ server đáp close
    }
}
