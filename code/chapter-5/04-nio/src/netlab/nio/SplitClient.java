package netlab.nio;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.Socket;

/**
 * V33: gửi hai dòng "hello" và "xin chào" thành ba mảnh, cách nhau 500 ms: "hel" | "lo\nxi" | "n chào\n". Ranh giới mảnh
 * không trùng ranh giới dòng (chữ "à" là 2 byte UTF-8, nằm ở mảnh thứ ba). Chạy với NioEchoServer --trace để thấy mỗi lần
 * read chỉ nhận một phần dòng.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.nio.SplitClient}
 */
public final class SplitClient {

    public static void main(String[] args) throws Exception {
        try (Socket socket = new Socket("127.0.0.1", 9199)) {
            socket.setTcpNoDelay(true);  // gửi mỗi mảnh ngay, không gộp
            OutputStream out = socket.getOutputStream();
            var in = new BufferedReader(new InputStreamReader(socket.getInputStream(), UTF_8));
            for (String piece : new String[] {"hel", "lo\nxi", "n chào\n"}) {
                out.write(piece.getBytes(UTF_8));
                out.flush();
                System.out.printf("sent %d bytes%n", piece.getBytes(UTF_8).length);
                Thread.sleep(500);
            }
            System.out.println("echoed: " + in.readLine());
            System.out.println("echoed: " + in.readLine());
        }
    }
}
