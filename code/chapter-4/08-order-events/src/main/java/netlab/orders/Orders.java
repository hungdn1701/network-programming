package netlab.orders;

import com.rabbitmq.client.BuiltinExchangeType;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.ConnectionFactory;
import java.io.IOException;

/**
 * V29: xử lý đơn hàng hướng sự kiện — một exchange topic, ba queue cho ba nhu cầu. Routing key của sự kiện đặt hàng có dạng
 * order.&lt;vùng&gt;.&lt;mã đơn&gt;. orders.analytics và orders.email bind order.# (khớp mọi đơn hàng): mỗi queue nhận một bản, như
 * exchange fanout (publish/subscribe). orders.email có nhiều worker cùng nhận (work queue). orders.hanoi bind order.hn.* (routing
 * theo topic): kho Hà Nội chỉ nhận đơn giao ở Hà Nội.
 */
final class Orders {

    static final String EXCHANGE = "orders";

    private Orders() {
    }

    static ConnectionFactory factory() {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost("127.0.0.1");
        return factory;
    }

    static void declare(Channel channel) throws IOException {
        channel.exchangeDeclare(EXCHANGE, BuiltinExchangeType.TOPIC);
        for (String queue : new String[] {"orders.analytics", "orders.email", "orders.hanoi"}) {
            channel.queueDeclare(queue, true, false, false, null);
            channel.queuePurge(queue);  // demo: bắt đầu với queue rỗng
        }
        channel.queueBind("orders.analytics", EXCHANGE, "order.#");  // mọi đơn hàng: publish/subscribe
        channel.queueBind("orders.email", EXCHANGE, "order.#");      // mọi đơn hàng, chia cho các worker: work queue
        channel.queueBind("orders.hanoi", EXCHANGE, "order.hn.*");   // chỉ đơn ở Hà Nội: routing theo topic
    }
}
