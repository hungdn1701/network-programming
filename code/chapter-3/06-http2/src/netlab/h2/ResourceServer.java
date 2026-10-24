package netlab.h2;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.eclipse.jetty.http.HttpHeader;
import org.eclipse.jetty.http2.server.HTTP2CServerConnectionFactory;
import org.eclipse.jetty.io.Content;
import org.eclipse.jetty.server.Handler;
import org.eclipse.jetty.server.HttpConfiguration;
import org.eclipse.jetty.server.HttpConnectionFactory;
import org.eclipse.jetty.server.Request;
import org.eclipse.jetty.server.Response;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.ServerConnector;
import org.eclipse.jetty.util.Callback;

/**
 * V20: server tài nguyên nhỏ trên Jetty, nhận cả HTTP/1.1 và HTTP/2 không mã hóa (h2c) ở port 9402. Mỗi tài nguyên
 * {@code /r<n>} trả sau 200 ms (mô phỏng thời gian xử lý và độ trễ). Server đếm các request tài nguyên theo port của
 * client, tức theo kết nối TCP: {@code /reset} xóa bộ đếm, {@code /stats} trả số request, số kết nối và giao thức.
 *
 * <p>Chạy: {@code java -cp "out;lib/*" netlab.h2.ResourceServer}
 */
public final class ResourceServer {

    private static final Map<Integer, AtomicInteger> perConnection = new ConcurrentHashMap<>();  // port client -> số request
    private static final Map<String, Boolean> protocols = new ConcurrentHashMap<>();

    public static void main(String[] args) throws Exception {
        Server server = new Server();
        HttpConfiguration config = new HttpConfiguration();
        ServerConnector connector = new ServerConnector(server,
                new HttpConnectionFactory(config),            // HTTP/1.1
                new HTTP2CServerConnectionFactory(config));   // HTTP/2 không mã hóa (h2c), cùng port
        connector.setPort(9402);
        server.addConnector(connector);
        server.setHandler(new Handler.Abstract() {
            @Override
            public boolean handle(Request request, Response response, Callback callback) throws Exception {
                String path = Request.getPathInContext(request);
                String body = switch (path) {
                    case "/reset" -> reset();
                    case "/stats" -> stats();
                    default -> resource(request, path);
                };
                response.getHeaders().put(HttpHeader.CONTENT_TYPE, "text/plain; charset=utf-8");
                Content.Sink.write(response, true, body, callback);
                return true;
            }
        });
        server.start();
        System.out.println("resources on http://localhost:9402 (HTTP/1.1 and h2c)");
        server.join();
    }

    static String resource(Request request, String path) throws InterruptedException {
        if (path.startsWith("/r")) {
            perConnection.computeIfAbsent(Request.getRemotePort(request), p -> new AtomicInteger()).incrementAndGet();
            protocols.put(request.getConnectionMetaData().getProtocol(), true);
            Thread.sleep(200);                                // mỗi tài nguyên mất 200 ms
        }
        return "resource " + path;
    }

    static String reset() {
        perConnection.clear();
        protocols.clear();
        return "reset";
    }

    static String stats() {
        int requests = perConnection.values().stream().mapToInt(AtomicInteger::get).sum();
        String line = requests + " requests on " + perConnection.size() + " connection(s), protocol " + protocols.keySet();
        System.out.println(line);
        return line;
    }
}
