package netlab.notify;

import com.rabbitmq.client.BuiltinExchangeType;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.ConnectionFactory;
import java.io.IOException;

/**
 * V29: một exchange topic, ba queue cho ba nhu cầu. Routing key của sự kiện cập nhật có dạng entry.&lt;quốc gia&gt;.&lt;khóa&gt;.
 * notify.log và notify.email bind entry.# (khớp mọi sự kiện): mỗi queue nhận một bản, như exchange fanout (publish/subscribe).
 * notify.email có nhiều worker cùng nhận (work queue). notify.vn bind entry.vn.* (routing theo topic).
 */
final class Notify {

    static final String EXCHANGE = "lookup.notify";

    private Notify() {
    }

    static ConnectionFactory factory() {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost("127.0.0.1");
        return factory;
    }

    static void declare(Channel channel) throws IOException {
        channel.exchangeDeclare(EXCHANGE, BuiltinExchangeType.TOPIC);
        for (String queue : new String[] {"notify.log", "notify.email", "notify.vn"}) {
            channel.queueDeclare(queue, true, false, false, null);
            channel.queuePurge(queue);  // demo: bắt đầu với queue rỗng
        }
        channel.queueBind("notify.log", EXCHANGE, "entry.#");      // mọi sự kiện: publish/subscribe
        channel.queueBind("notify.email", EXCHANGE, "entry.#");    // mọi sự kiện, chia cho các worker: work queue
        channel.queueBind("notify.vn", EXCHANGE, "entry.vn.*");    // chỉ khóa ở Việt Nam: routing theo topic
    }
}
