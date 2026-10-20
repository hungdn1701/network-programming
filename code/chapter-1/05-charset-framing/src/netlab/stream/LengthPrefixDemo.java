package netlab.stream;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

/**
 * V06, slide 6: framing bằng tiền tố độ dài. Bên gửi ghi 4 byte độ dài (số byte, không phải số ký tự) rồi đến dữ
 * liệu; bên nhận đọc độ dài, rồi readFully đọc đủ đúng số byte đó (thiếu thì EOFException).
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.stream.LengthPrefixDemo}
 */
public final class LengthPrefixDemo {

    public static void main(String[] args) throws IOException {
        byte[] data = "huế".getBytes(StandardCharsets.UTF_8);
        var bytes = new ByteArrayOutputStream();  // ở vị trí stream của socket
        try (var out = new DataOutputStream(bytes)) {
            out.writeInt(data.length);  // tiền tố: 4 byte độ dài
            out.write(data);
        }
        System.out.println(HexFormat.ofDelimiter(" ").withUpperCase().formatHex(bytes.toByteArray()));
        try (var in = new DataInputStream(new ByteArrayInputStream(bytes.toByteArray()))) {
            byte[] message = new byte[in.readInt()];
            in.readFully(message);  // đọc đủ số byte đã báo
            System.out.println(message.length + " bytes: " + new String(message, StandardCharsets.UTF_8));
        }
    }
}
