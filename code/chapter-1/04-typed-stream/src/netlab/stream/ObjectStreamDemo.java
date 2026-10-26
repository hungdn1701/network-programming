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

    /** Bản ghi đo của một cảm biến: mã cảm biến, nhiệt độ (độ C), tên phòng. */
    static final class SensorReading implements Serializable {
        private static final long serialVersionUID = 1L;
        private final int sensorId;
        private final double temperature;
        private final String room;

        SensorReading(int sensorId, double temperature, String room) {
            this.sensorId = sensorId;
            this.temperature = temperature;
            this.room = room;
        }

        @Override
        public boolean equals(Object o) {
            return o instanceof SensorReading other && sensorId == other.sensorId
                    && temperature == other.temperature && room.equals(other.room);
        }

        @Override
        public int hashCode() {
            return Objects.hash(sensorId, temperature, room);
        }
    }

    public static void main(String[] args) throws IOException, ClassNotFoundException {
        var sent = new SensorReading(1001, 27.5, "P301");
        var bytes = new ByteArrayOutputStream();  // ở vị trí stream của socket
        try (var out = new ObjectOutputStream(bytes)) {
            out.writeObject(sent);
        }
        System.out.println("serialized: " + bytes.size() + " bytes");
        try (var in = new ObjectInputStream(new ByteArrayInputStream(bytes.toByteArray()))) {
            var received = (SensorReading) in.readObject();
            System.out.println("equals: " + sent.equals(received) + ", same object: " + (sent == received));
        }
    }
}
