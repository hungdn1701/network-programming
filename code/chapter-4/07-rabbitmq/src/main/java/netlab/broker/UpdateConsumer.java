package netlab.broker;

import static java.nio.charset.StandardCharsets.UTF_8;

import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.DeliverCallback;
import java.util.List;
import java.util.concurrent.CountDownLatch;

/**
 * V28: consumer. Nhận sự kiện từ queue lookup.updates, xử lý (mô phỏng 200 ms), rồi gửi ack để broker xóa message.
 * Tùy chọn: {@code --auto-ack} (broker xóa message ngay khi giao), {@code --crash-on <key>} (tắt hẳn tiến trình khi đang xử lý
 * sự kiện của khóa đó), {@code --max <n>} (dừng sau n message, để chạy theo kịch bản).
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.broker.UpdateConsumer [tùy chọn]}
 */
public final class UpdateConsumer {

    public static void main(String[] args) throws Exception {
        List<String> opts = List.of(args);
        boolean autoAck = opts.contains("--auto-ack");
        String crashOn = opts.contains("--crash-on") ? opts.get(opts.indexOf("--crash-on") + 1) : null;
        int max = opts.contains("--max") ? Integer.parseInt(opts.get(opts.indexOf("--max") + 1)) : Integer.MAX_VALUE;

        Connection connection = Topology.factory().newConnection();
        Channel channel = connection.createChannel();
        Topology.declare(channel);
        CountDownLatch done = new CountDownLatch(max);
        DeliverCallback onMessage = (tag, delivery) -> {
            String event = new String(delivery.getBody(), UTF_8);
            System.out.println("got \"" + event + "\"" + (delivery.getEnvelope().isRedeliver() ? " (redelivered)" : ""));
            if (event.equals("updated " + crashOn)) {
                System.out.println("crash while processing \"" + event + "\"");
                Runtime.getRuntime().halt(1);  // tiến trình chết giữa chừng, chưa kịp ack
            }
            sleep(200);  // mô phỏng xử lý
            if (!autoAck) {
                channel.basicAck(delivery.getEnvelope().getDeliveryTag(), false);  // xử lý xong mới ack
            }
            done.countDown();
        };
        channel.basicConsume(Topology.QUEUE, autoAck, onMessage, consumerTag -> { });
        System.out.println("consumer waiting on " + Topology.QUEUE + (autoAck ? " (autoAck)" : " (manual ack)"));
        done.await();
        connection.close();
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
