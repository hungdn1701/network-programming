package netlab.stream;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;

/**
 * V06, slide 5: framing bằng ký tự phân cách, với phần header của một request HTTP/1.1 (RFC 9112): mỗi dòng kết
 * thúc bằng CRLF, một dòng trống kết thúc phần header. Các dòng nằm liền nhau trong cùng một khối byte (như khi TCP
 * gộp nhiều lần ghi); readLine tách đúng tại CRLF, bỏ CRLF khỏi dòng trả về, và trả null khi hết dữ liệu.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.stream.LineFramingDemo}
 */
public final class LineFramingDemo {

    public static void main(String[] args) throws IOException {
        var bytes = new ByteArrayOutputStream();  // các dòng liền nhau trong một khối byte
        try (var out = new BufferedWriter(new OutputStreamWriter(bytes, StandardCharsets.US_ASCII))) {
            out.write("GET / HTTP/1.1\r\nHost: ptit.edu.vn\r\nConnection: close\r\n\r\n");
        }
        var stream = new ByteArrayInputStream(bytes.toByteArray());
        try (var in = new BufferedReader(new InputStreamReader(stream, StandardCharsets.US_ASCII))) {
            String line;
            while ((line = in.readLine()) != null && !line.isEmpty()) {  // dòng trống: hết phần header
                System.out.println(line.length() + " chars: " + line);
            }
        }
    }
}
