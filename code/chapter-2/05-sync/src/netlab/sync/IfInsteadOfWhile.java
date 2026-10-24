package netlab.sync;

import java.util.ArrayDeque;
import java.util.Deque;

/**
 * V12: lỗi wait() trong if. Hai worker cùng chờ một hàng đợi rỗng; main đưa vào một phần tử rồi notifyAll() đánh thức
 * cả hai. Worker lấy được phần tử trước; worker còn lại không kiểm tra lại điều kiện, lấy từ hàng đợi rỗng và nhận
 * NoSuchElementException. Thứ tự hai worker có thể đổi giữa các lần chạy.
 *
 * <p>Chạy: {@code java -cp out netlab.sync.IfInsteadOfWhile}
 */
public final class IfInsteadOfWhile {

    /** Bản sai của take(): kiểm tra điều kiện bằng if. */
    static final class IfBuffer {
        private final Deque<String> items = new ArrayDeque<>();

        synchronized void put(String item) {
            items.addLast(item);
            notifyAll();
        }

        synchronized String take() throws InterruptedException {
            if (items.isEmpty()) {  // SAI: chỉ kiểm tra điều kiện một lần
                wait();
            }
            return items.removeFirst();  // tỉnh dậy mà hàng đợi vẫn rỗng thì ném ngoại lệ
        }
    }

    public static void main(String[] args) throws InterruptedException {
        IfBuffer buffer = new IfBuffer();
        Runnable consume = () -> {
            String name = Thread.currentThread().getName();
            try {
                System.out.println(name + ": took " + buffer.take());
            } catch (Exception e) {
                System.out.println(name + ": " + e.getClass().getSimpleName());
            }
        };
        Thread first = new Thread(consume, "worker-1");
        Thread second = new Thread(consume, "worker-2");
        first.start();
        second.start();
        Thread.sleep(500);  // hai worker đều đang chờ trong wait()
        buffer.put("conn-1");  // một phần tử; notifyAll() đánh thức cả hai
        first.join();
        second.join();
    }
}
