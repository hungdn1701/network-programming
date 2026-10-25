package netlab.iot;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken;
import org.eclipse.paho.client.mqttv3.MqttCallback;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;

/**
 * V36: QoS 1 giao "ít nhất một lần". Dịch vụ cảnh báo subscribe canh-bao/# với QoS 1 và clean session = false; nó xử lý
 * cảnh báo A1 nhưng mất kết nối trước khi gửi PUBACK. Khi kết nối lại với cùng client ID, broker giao lại A1 (cờ dup);
 * dịch vụ nhận ra A1 đã xử lý nhờ tập ID và bỏ qua.
 *
 * <p>Chạy (broker đang chạy): {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.iot.AlertDemo}
 */
public final class AlertDemo {

    private static final long START = System.nanoTime();

    private static void log(String format, Object... args) {
        System.out.printf("%4.1f s  %s%n", (System.nanoTime() - START) / 1e9, String.format(format, args));
    }

    public static void main(String[] args) throws Exception {
        Set<String> processed = new HashSet<>();  // ứng dụng thật lưu tập này bền vững, cùng dữ liệu đã xử lý
        CountDownLatch firstDelivery = new CountDownLatch(1);
        CountDownLatch redelivery = new CountDownLatch(1);
        MqttClient service = new MqttClient("tcp://127.0.0.1:1883", "alert-service", new MemoryPersistence());
        service.setManualAcks(true);  // ứng dụng tự quyết lúc gửi PUBACK
        service.setCallback(new MqttCallback() {
            @Override
            public void messageArrived(String topic, MqttMessage message) throws Exception {
                String alert = new String(message.getPayload(), UTF_8);
                String id = alert.substring(0, alert.indexOf(':'));
                if (!processed.add(id)) {  // đã xử lý: chỉ gửi PUBACK
                    log("received %s dup=%b: already processed, skipped", id, message.isDuplicate());
                    service.messageArrivedComplete(message.getId(), message.getQos());
                    redelivery.countDown();
                    return;
                }
                log("received %s dup=%b: processed, connection lost before PUBACK", id, message.isDuplicate());
                firstDelivery.countDown();  // không gửi PUBACK: như dịch vụ mất kết nối ngay sau khi xử lý
            }

            @Override
            public void connectionLost(Throwable cause) {
            }

            @Override
            public void deliveryComplete(IMqttDeliveryToken token) {
            }
        });
        MqttConnectOptions options = new MqttConnectOptions();
        options.setCleanSession(false);  // broker giữ subscription và message chưa được ack khi client mất kết nối
        service.connect(options);
        service.subscribe("canh-bao/#", 1);  // # : mọi cấp phía sau
        log("alert-service subscribed to canh-bao/# with QoS 1, clean session false");

        MqttClient monitor = new MqttClient("tcp://127.0.0.1:1883", "monitor", new MemoryPersistence());
        monitor.connect();
        monitor.publish("canh-bao/101", "A1: phong 101 vuot 30 do".getBytes(UTF_8), 1, false);
        log("monitor published A1 to canh-bao/101 with QoS 1");

        firstDelivery.await(5, TimeUnit.SECONDS);
        service.disconnectForcibly(0, 1000, false);  // đóng kết nối, không gửi DISCONNECT và PUBACK
        log("alert-service reconnects with the same client ID");
        service.connect(options);
        if (!redelivery.await(30, TimeUnit.SECONDS)) {
            log("no redelivery");
        }
        Thread.sleep(2000);  // chờ thêm: broker có thể giao lại nhiều lần
        service.disconnect();
        monitor.disconnect();
        service.close();
        monitor.close();
    }
}
