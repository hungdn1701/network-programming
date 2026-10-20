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
 * V06, slide 5: framing bằng ký tự phân cách LF. Hai message nằm liền nhau trong cùng một khối byte (như khi TCP
 * gộp hai lần ghi); readLine tách đúng tại LF và trả null khi hết dữ liệu.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.stream.LineFramingDemo}
 */
public final class LineFramingDemo {

    public static void main(String[] args) throws IOException {
        var bytes = new ByteArrayOutputStream();  // hai message liền nhau trong một khối byte
        try (var out = new BufferedWriter(new OutputStreamWriter(bytes, StandardCharsets.UTF_8))) {
            out.write("hanoi\n");
            out.write("huế\n");
        }
        var stream = new ByteArrayInputStream(bytes.toByteArray());
        try (var in = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = in.readLine()) != null) {  // null: hết dữ liệu
                System.out.println("message: " + line);
            }
        }
    }
}
