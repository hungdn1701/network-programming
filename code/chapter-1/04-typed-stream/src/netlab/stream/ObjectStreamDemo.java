package netlab.stream;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.Objects;

/**
 * V05, slide 5: serialization. ObjectOutputStream ghi tên lớp, serialVersionUID và giá trị các trường;
 * ObjectInputStream dựng một đối tượng mới: equals trả true, == trả false.
 *
 * <p>Chạy: {@code java -cp out netlab.stream.ObjectStreamDemo}
 */
public final class ObjectStreamDemo {

    /** Yêu cầu tra cứu dạng đối tượng. */
    static final class LookupRequest implements Serializable {
        private static final long serialVersionUID = 1L;
        private final String key;

        LookupRequest(String key) {
            this.key = key;
        }

        @Override
        public boolean equals(Object o) {
            return o instanceof LookupRequest other && key.equals(other.key);
        }

        @Override
        public int hashCode() {
            return Objects.hash(key);
        }
    }

    public static void main(String[] args) throws IOException, ClassNotFoundException {
        var sent = new LookupRequest("hanoi");
        var bytes = new ByteArrayOutputStream();  // ở vị trí stream của socket
        try (var out = new ObjectOutputStream(bytes)) {
            out.writeObject(sent);
        }
        System.out.println("serialized: " + bytes.size() + " bytes");
        try (var in = new ObjectInputStream(new ByteArrayInputStream(bytes.toByteArray()))) {
            var received = (LookupRequest) in.readObject();
            System.out.println("equals: " + sent.equals(received) + ", same object: " + (sent == received));
        }
    }
}
