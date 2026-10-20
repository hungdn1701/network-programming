package netlab.stream;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.util.HexFormat;

/**
 * V05, slide 4: DataOutputStream ghi int, double, chuỗi theo định dạng cố định (big-endian; chuỗi có 2 byte độ
 * dài phía trước); DataInputStream đọc lại theo đúng thứ tự. ByteArrayOutputStream đứng ở vị trí stream của
 * socket để xem được từng byte.
 *
 * <p>Chạy: {@code java -cp out netlab.stream.DataStreamDemo}
 */
public final class DataStreamDemo {

    public static void main(String[] args) throws IOException {
        var bytes = new ByteArrayOutputStream();  // ở vị trí stream của socket
        try (var out = new DataOutputStream(bytes)) {
            out.writeInt(9199);
            out.writeDouble(1.5);
            out.writeUTF("hanoi");
        }
        System.out.println(HexFormat.ofDelimiter(" ").withUpperCase().formatHex(bytes.toByteArray()));
        try (var in = new DataInputStream(new ByteArrayInputStream(bytes.toByteArray()))) {
            System.out.println(in.readInt() + " " + in.readDouble() + " " + in.readUTF());
        }
    }
}
