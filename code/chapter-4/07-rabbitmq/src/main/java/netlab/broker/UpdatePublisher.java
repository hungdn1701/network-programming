package netlab.broker;

import static java.nio.charset.StandardCharsets.UTF_8;

import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.MessageProperties;

/**
 * V28: producer. Dịch vụ tra cứu, sau mỗi lần cập nhật, gửi sự kiện "khóa đã cập nhật" tới exchange lookup.events rồi đi tiếp:
 * không chờ bên nhận, không cần bên nhận đang chạy.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.broker.UpdatePublisher sapa dalat}
 */
public final class UpdatePublisher {

    public static void main(String[] args) throws Exception {
        try (Connection connection = Topology.factory().newConnection();
             Channel channel = connection.createChannel()) {
            Topology.declare(channel);
            for (String key : args) {
                String event = "updated " + key;
                channel.basicPublish(Topology.EXCHANGE, Topology.ROUTING_KEY,  // gửi tới exchange, kèm routing key
                        MessageProperties.TEXT_PLAIN, event.getBytes(UTF_8));
                System.out.println("published \"" + event + "\"");
            }
        }
    }
}
