package netlab.iot;

import static java.nio.charset.StandardCharsets.UTF_8;

import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken;
import org.eclipse.paho.client.mqttv3.MqttCallback;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;

/**
 * V36: dashboard giám sát. Subscribe nhiệt độ và trạng thái của mọi phòng bằng ký tự đại diện +, in mỗi message nhận được
 * kèm thời điểm (giây kể từ lúc subscribe) và cờ retained.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.iot.Dashboard [số giây]}
 */
public final class Dashboard {

    public static void main(String[] args) throws Exception {
        int seconds = args.length > 0 ? Integer.parseInt(args[0]) : 6;
        MqttClient client = new MqttClient("tcp://127.0.0.1:1883", "dashboard", new MemoryPersistence());
        long[] start = {System.nanoTime()};
        client.setCallback(new MqttCallback() {
            @Override
            public void messageArrived(String topic, MqttMessage message) {
                System.out.printf("%4.1f s  %-20s %s%s%n", (System.nanoTime() - start[0]) / 1e9, topic,
                        new String(message.getPayload(), UTF_8), message.isRetained() ? " (retained)" : "");
            }

            @Override
            public void connectionLost(Throwable cause) {
                System.out.println("connection lost: " + cause.getMessage());
            }

            @Override
            public void deliveryComplete(IMqttDeliveryToken token) {
            }
        });
        client.connect(new MqttConnectOptions());
        start[0] = System.nanoTime();
        client.subscribe(new String[] {"phong/+/nhiet-do", "phong/+/trang-thai"}, new int[] {0, 1});  // + : đúng một cấp
        Thread.sleep(seconds * 1000L);
        client.disconnect();
        client.close();
    }
}
