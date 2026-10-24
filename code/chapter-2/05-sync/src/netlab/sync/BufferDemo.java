package netlab.sync;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/**
 * V12: thread acceptor đưa 5 kết nối (giả lập bằng tên) vào hàng đợi tối đa 2 phần tử; thread worker lấy ra, mỗi kết
 * nối xử lý 300 ms. Khi hàng đợi đầy, put() của acceptor chờ đến khi worker lấy bớt. Mỗi sự kiện ghi kèm thời điểm,
 * in theo thứ tự thời gian sau khi hai thread kết thúc (in ngay thì dòng của hai thread có thể lẫn thứ tự).
 *
 * <p>Chạy: {@code java -cp out netlab.sync.BufferDemo}
 */
public final class BufferDemo {

    record Event(long nanos, String text) {
    }

    public static void main(String[] args) throws InterruptedException {
        BoundedBuffer<String> buffer = new BoundedBuffer<>(2);  // hàng đợi kết nối, tối đa 2 phần tử
        List<Event> events = Collections.synchronizedList(new ArrayList<>());
        Thread acceptor = new Thread(() -> {
            try {
                for (int i = 1; i <= 5; i++) {
                    long before = System.nanoTime();
                    buffer.put("conn-" + i);  // đầy thì chờ
                    long waited = (System.nanoTime() - before) / 1_000_000;
                    events.add(new Event(System.nanoTime(),
                            "acceptor  put  conn-" + i + (waited >= 50 ? "  (waited " + waited + " ms: buffer full)" : "")));
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "acceptor");
        Thread worker = new Thread(() -> {
            try {
                for (int i = 1; i <= 5; i++) {
                    String connection = buffer.take();  // rỗng thì chờ
                    events.add(new Event(System.nanoTime(), "worker    took " + connection));
                    Thread.sleep(300);  // xử lý một kết nối mất 300 ms
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "worker");
        long start = System.nanoTime();
        acceptor.start();
        worker.start();
        acceptor.join();
        worker.join();
        events.sort(Comparator.comparingLong(Event::nanos));
        for (Event e : events) {
            System.out.printf("%5d ms  %s%n", (e.nanos() - start) / 1_000_000, e.text());
        }
    }
}
