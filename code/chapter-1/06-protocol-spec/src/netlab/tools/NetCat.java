package netlab.tools;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.FileDescriptor;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;

import static java.nio.charset.StandardCharsets.UTF_8;

/**
 * NetCat tối giản, bản Java, chạy trên mọi hệ điều hành có JDK 21: thử một giao thức theo dòng khi chưa có chương
 * trình. Mã socket bên trong học ở Chương 2; ở Chương 1 chỉ dùng như một công cụ.
 *
 * <pre>
 *   java -cp out netlab.tools.NetCat -l 9199          lắng nghe ở 127.0.0.1:9199, nhận một kết nối
 *   java -cp out netlab.tools.NetCat 127.0.0.1 9199   kết nối tới endpoint
 * </pre>
 *
 * Mỗi dòng gõ vào được gửi đi (UTF-8, kết thúc bằng LF); mỗi dòng nhận được in ra. Hết đầu vào (Ctrl+D, hoặc
 * Ctrl+Z rồi Enter trên Windows) thì báo cho đầu kia và chờ đầu kia đóng.
 *
 * <p>Tùy chọn {@code --echo} (dùng khi chạy theo kịch bản, xem {@link NetCatSession}): in lại mỗi dòng gửi đi với
 * dấu "> " để bản ghi màn hình có cả hai chiều. Dòng rỗng nhận được in thành "(empty line)"; dòng dài hơn 60 ký tự
 * in rút gọn kèm số byte. Dữ liệu gửi và nhận luôn đủ, chỉ phần in ra màn hình được rút gọn.
 *
 * <p>Trên Windows, gõ tiếng Việt trong console cần chạy {@code chcp 65001} trước.
 */
public final class NetCat {

    private static final PrintStream OUT = new PrintStream(new FileOutputStream(FileDescriptor.out), true, UTF_8);

    public static void main(String[] args) throws IOException, InterruptedException {
        boolean echo = args.length > 0 && args[0].equals("--echo");
        String[] a = echo ? java.util.Arrays.copyOfRange(args, 1, args.length) : args;
        Socket socket;
        if (a.length == 2 && a[0].equals("-l")) {
            int port = Integer.parseInt(a[1]);
            try (var listener = new ServerSocket(port, 1, InetAddress.getLoopbackAddress())) {
                OUT.println("listening on 127.0.0.1:" + port);
                socket = listener.accept();
            }
            OUT.println("connection from " + socket.getInetAddress().getHostAddress() + ":" + socket.getPort());
        } else if (a.length == 2) {
            socket = new Socket(a[0], Integer.parseInt(a[1]));
            OUT.println("connected to " + a[0] + ":" + a[1]);
        } else {
            OUT.println("usage: NetCat [--echo] -l <port> | NetCat [--echo] <host> <port>");
            return;
        }
        try (socket) {
            var fromPeer = new BufferedReader(new InputStreamReader(socket.getInputStream(), UTF_8));
            Thread receiver = new Thread(() -> {
                try {
                    String line;
                    while ((line = fromPeer.readLine()) != null) {
                        OUT.println(show(line));
                    }
                    OUT.println("(connection closed by peer)");
                } catch (IOException e) {
                    OUT.println("(connection error: " + e.getMessage() + ")");
                }
            });
            receiver.start();
            var toPeer = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), UTF_8));
            var keyboard = new BufferedReader(new InputStreamReader(System.in, UTF_8));
            String line;
            while ((line = keyboard.readLine()) != null) {
                if (echo) {
                    OUT.println("> " + show(line));
                }
                toPeer.write(line + "\n");
                toPeer.flush();
            }
            socket.shutdownOutput();  // hết đầu vào: báo cho đầu kia, vẫn nhận tiếp
            receiver.join();
        }
    }

    static String show(String line) {
        if (line.isEmpty()) {
            return "(empty line)";
        }
        return line.length() <= 60 ? line : line.substring(0, 20) + "… (" + line.getBytes(UTF_8).length + " bytes)";
    }
}
