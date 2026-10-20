package netlab.stream;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

/**
 * V06, slide 4: cùng một dãy byte, đọc theo hai charset. Bên gửi ghi "Hà Nội" bằng UTF-8; bên nhận đọc bằng
 * UTF-8 thì đúng, đọc bằng windows-1252 thì sai. ByteArrayOutputStream đứng ở vị trí stream của socket.
 *
 * <p>Chạy (in tiếng Việt ra file đúng UTF-8): {@code java -Dstdout.encoding=UTF-8 -cp out netlab.stream.CharsetDemo}
 */
public final class CharsetDemo {

    public static void main(String[] args) throws IOException {
        var bytes = new ByteArrayOutputStream();  // ở vị trí stream của socket
        try (var out = new BufferedWriter(new OutputStreamWriter(bytes, StandardCharsets.UTF_8))) {
            out.write("Hà Nội\n");
        }
        byte[] received = bytes.toByteArray();
        System.out.println(received.length + " bytes: " + HexFormat.ofDelimiter(" ").withUpperCase().formatHex(received));
        var utf8 = new InputStreamReader(new ByteArrayInputStream(received), StandardCharsets.UTF_8);
        System.out.println("UTF-8:        " + new BufferedReader(utf8).readLine());
        var cp1252 = new InputStreamReader(new ByteArrayInputStream(received), Charset.forName("windows-1252"));
        System.out.println("windows-1252: " + new BufferedReader(cp1252).readLine());  // SAI charset
    }
}
