package netlab.tools;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

import static java.nio.charset.StandardCharsets.UTF_8;

/**
 * Ghi lại một phiên thử giao thức tra cứu bằng hai NetCat thật (replay cho slide, CONVENTIONS.md mục 8a): một tiến
 * trình lắng nghe đóng vai server, một tiến trình đóng vai client. Chương trình này "gõ" từng dòng theo kịch bản,
 * chờ đầu kia nhận rồi mới gõ dòng tiếp, và lưu màn hình của từng terminal vào results/.
 *
 * <p>Chạy: {@code java -cp out netlab.tools.NetCatSession} (port 9199 phải trống)
 */
public final class NetCatSession {

    /** Mỗi bước: dòng client gõ, dòng người đóng vai server gõ theo đặc tả (PROTOCOL.md). */
    private static final String[][] STEPS = {
        {"hanoi", "OK Thủ đô của Việt Nam"},
        {"atlantis", "NOTFOUND"},
        {"", "ERR empty key"},
        {"x".repeat(300), "ERR line too long"},
    };

    record Terminal(Process process, Writer keyboard, List<String> screen) {
        void type(String line) throws IOException {
            keyboard.write(line + "\n");
            keyboard.flush();
        }

        void await(String text) throws InterruptedException {
            for (int i = 0; i < 100; i++) {
                synchronized (screen) {
                    if (screen.stream().anyMatch(l -> l.equals(text) || l.startsWith(text))) {
                        return;
                    }
                }
                Thread.sleep(50);
            }
            throw new IllegalStateException("không thấy dòng: " + text + " trong " + screen);
        }
    }

    public static void main(String[] args) throws Exception {
        Terminal server = open("--echo", "-l", "9199");
        server.await("listening on");
        Terminal client = open("--echo", "127.0.0.1", "9199");
        client.await("connected to");
        server.await("connection from");
        for (String[] step : STEPS) {
            client.type(step[0]);
            server.await(NetCat.show(step[0]));
            server.type(step[1]);
            client.await(step[1]);
        }
        client.keyboard().close();  // client hết đầu vào
        server.await("(connection closed by peer)");
        server.keyboard().close();
        client.await("(connection closed by peer)");
        server.process().waitFor(5, TimeUnit.SECONDS);
        client.process().waitFor(5, TimeUnit.SECONDS);
        save("results/NetCat-server.txt", server.screen());
        save("results/NetCat-client.txt", client.screen());
    }

    private static Terminal open(String... netcatArgs) throws IOException {
        List<String> command = new ArrayList<>(List.of(ProcessHandle.current().info().command().orElse("java"),
                "-cp", System.getProperty("java.class.path"), NetCat.class.getName()));
        command.addAll(List.of(netcatArgs));
        Process p = new ProcessBuilder(command).redirectErrorStream(true).start();
        List<String> screen = new ArrayList<>();
        Thread reader = new Thread(() -> {
            try (var in = new BufferedReader(new InputStreamReader(p.getInputStream(), UTF_8))) {
                String line;
                while ((line = in.readLine()) != null) {
                    synchronized (screen) {
                        screen.add(line);
                    }
                }
            } catch (IOException ignored) {
                // tiến trình đã kết thúc
            }
        });
        reader.setDaemon(true);
        reader.start();
        return new Terminal(p, new OutputStreamWriter(p.getOutputStream(), UTF_8), screen);
    }

    private static void save(String file, List<String> screen) throws IOException {
        synchronized (screen) {
            Files.write(Path.of(file), screen, UTF_8);
        }
    }
}
