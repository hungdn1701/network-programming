package netlab.timeout;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.Socket;

/**
 * V09: echo client chế độ batch (Stevens, Unix Network Programming, mục 6.6): gửi hết dữ liệu, flush, kết thúc chiều gửi bằng
 * shutdownOutput(), rồi vẫn đọc mọi dòng được gửi lại cho tới khi server đóng kết nối. shutdownOutput() không flush buffer
 * của ứng dụng: bỏ dòng flush thì server nhận 0 dòng.
 *
 * <p>Chạy ở terminal thứ hai, sau BatchEchoServer: {@code java -cp out netlab.timeout.HalfCloseClient}
 */
public final class HalfCloseClient {

    public static void main(String[] args) throws IOException {
        try (Socket socket = new Socket("127.0.0.1", 9199)) {
            var out = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), UTF_8));
            var in = new BufferedReader(new InputStreamReader(socket.getInputStream(), UTF_8));
            out.write("line 1\nline 2\nline 3\n");
            out.flush();  // đẩy dữ liệu khỏi buffer của ứng dụng trước
            socket.shutdownOutput();  // half-close: hết dữ liệu gửi, chiều nhận vẫn mở
            System.out.println("sent 3 lines, output shut down");
            String line;
            while ((line = in.readLine()) != null) {  // đọc mọi dòng được gửi lại
                System.out.println("echoed: " + line);
            }
            System.out.println("readLine() returned null: server closed the connection");
        }
    }
}
