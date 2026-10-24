package netlab.sync;

import java.util.ArrayDeque;
import java.util.Deque;

/**
 * V12: hàng đợi có giới hạn giữa thread nhận kết nối (producer) và thread xử lý (consumer). Đầy thì put() chờ, rỗng
 * thì take() chờ; wait() nhả monitor trong lúc chờ, notifyAll() đánh thức các thread đang chờ trên cùng monitor.
 * Điều kiện luôn được kiểm tra lại trong vòng lặp while.
 */
final class BoundedBuffer<T> {

    private final Deque<T> items = new ArrayDeque<>();
    private final int capacity;

    BoundedBuffer(int capacity) {
        this.capacity = capacity;
    }

    synchronized void put(T item) throws InterruptedException {
        while (items.size() == capacity) {  // đầy: chờ; wait() nhả monitor trong lúc chờ
            wait();
        }
        items.addLast(item);
        notifyAll();  // đánh thức các thread đang chờ trên monitor này
    }

    synchronized T take() throws InterruptedException {
        while (items.isEmpty()) {  // rỗng: chờ đến khi có phần tử
            wait();
        }
        T item = items.removeFirst();
        notifyAll();
        return item;
    }
}
