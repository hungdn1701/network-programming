package netlab.iot;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.util.Locale;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;

/**
 * V36: cảm biến nhiệt độ giả lập của một phòng. Đăng ký last will (offline) khi kết nối, publish trạng thái online, rồi mỗi
 * giây publish nhiệt độ tới phong/<phòng>/nhiet-do với QoS 0 và retained. Đối số --crash: sau lần đo cuối, dừng tiến trình
 * ngay (như mất điện), không gửi DISCONNECT.
 *
 * <p>Chạy: {@code java -cp "target/classes;target/dependency/*" netlab.iot.Sensor <phòng> <số lần đo> [--crash]}
 */
public final class Sensor {

    public static void main(String[] args) throws Exception {
        String room = args.length > 0 ? args[0] : "101";
        int readings = args.length > 1 ? Integer.parseInt(args[1]) : 5;
        boolean crash = args.length > 2 && args[2].equals("--crash");
        String status = "phong/" + room + "/trang-thai";
        MqttClient client = new MqttClient("tcp://127.0.0.1:1883", "sensor-" + room, new MemoryPersistence());
        MqttConnectOptions options = new MqttConnectOptions();
        options.setKeepAliveInterval(10);  // 10 giây không trao đổi gì thì gửi PINGREQ để giữ kết nối
        options.setWill(status, "offline".getBytes(UTF_8), 1, true);  // last will: broker gửi thay nếu cảm biến mất kết nối
        client.connect(options);
        client.publish(status, "online".getBytes(UTF_8), 1, true);
        double base = room.equals("101") ? 26.0 : 24.5;
        for (int i = 0; i < readings; i++) {
            String value = String.format(Locale.ROOT, "%.1f", base + 0.1 * i);
            client.publish("phong/" + room + "/nhiet-do", value.getBytes(UTF_8), 0, true);  // QoS 0, retained: giữ giá trị gần nhất
            Thread.sleep(1000);
        }
        if (crash) {
            Runtime.getRuntime().halt(1);  // như mất điện: socket đóng, không có DISCONNECT
        }
        client.publish(status, "offline".getBytes(UTF_8), 1, true);  // dừng có chủ đích: tự báo offline
        client.disconnect();
        client.close();
    }
}
