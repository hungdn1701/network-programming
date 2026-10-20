package netlab.stream;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;

/**
 * V05, slide 6: đọc sai thứ tự không báo lỗi mà cho giá trị sai. Bên ghi ghi int rồi double; bên đọc đọc double trước.
 *
 * <p>Chạy: {@code java -cp out netlab.stream.WrongOrderDemo}
 */
public final class WrongOrderDemo {

    public static void main(String[] args) throws IOException {
        var bytes = new ByteArrayOutputStream();
        try (var out = new DataOutputStream(bytes)) {
            out.writeInt(9199);
            out.writeDouble(1.5);
        }
        try (var in = new DataInputStream(new ByteArrayInputStream(bytes.toByteArray()))) {
            System.out.println(in.readDouble());  // SAI: phía ghi đã ghi int trước
            System.out.println(in.readInt());
        }
    }
}
