package netlab.timeout;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.Socket;

/**
 * V09: client half-close. Gửi ba dòng, flush, kết thúc chiều gửi bằng shutdownOutput(), rồi vẫn đọc được phản hồi.
 * shutdownOutput() không flush buffer của ứng dụng: bỏ dòng flush thì server nhận 0 dòng.
 *
 * <p>Chạy ở terminal thứ hai, sau LineCountServer: {@code java -cp out netlab.timeout.HalfCloseClient}
 */
public final class HalfCloseClient {

    public static void main(String[] args) throws IOException {
        try (Socket socket = new Socket("127.0.0.1", 9199)) {
            var out = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), UTF_8));
            var in = new BufferedReader(new InputStreamReader(socket.getInputStream(), UTF_8));
            out.write("hanoi\nhue\ndanang\n");
            out.flush();  // đẩy dữ liệu khỏi buffer của ứng dụng trước
            socket.shutdownOutput();  // half-close: hết dữ liệu gửi, chiều nhận vẫn mở
            System.out.println("sent 3 lines, output shut down");
            System.out.println("reply: " + in.readLine());
            System.out.println("next readLine(): " + in.readLine());  // null: server đã đóng kết nối
        }
    }
}
