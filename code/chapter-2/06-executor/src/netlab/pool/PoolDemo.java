package netlab.pool;

import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/**
 * V13: thread pool có giới hạn. 4 thread, hàng đợi tối đa 5 tác vụ, saturation policy CallerRunsPolicy. Gửi 10 tác vụ,
 * mỗi tác vụ chạy 500 ms: tác vụ 1–4 chạy ngay trên 4 thread của pool, 5–9 vào hàng đợi, tác vụ 10 gặp hàng đợi đầy nên
 * chạy trên thread gọi execute (main). Mỗi dòng in kèm thời điểm bắt đầu tác vụ.
 *
 * <p>Chạy: {@code java -cp out netlab.pool.PoolDemo}
 */
public final class PoolDemo {

    private static final long START = System.nanoTime();

    public static void main(String[] args) throws InterruptedException {
        ThreadPoolExecutor pool = new ThreadPoolExecutor(
                4, 4, 0, TimeUnit.SECONDS,                    // đúng 4 thread
                new ArrayBlockingQueue<>(5),                  // hàng đợi tối đa 5 tác vụ
                new ThreadPoolExecutor.CallerRunsPolicy());   // đầy: chạy trên thread gọi execute
        for (int i = 1; i <= 10; i++) {
            int task = i;
            pool.execute(() -> work(task));  // gửi tác vụ; pool quyết định thread nào chạy
        }
        pool.shutdown();  // không nhận tác vụ mới, chạy nốt tác vụ đã nhận
        pool.awaitTermination(10, TimeUnit.SECONDS);
    }

    /** Một tác vụ: in thời điểm bắt đầu và tên thread đang chạy, rồi chạy 500 ms. */
    static void work(int task) {
        System.out.printf("%4d ms  task %d runs on %s%n", (System.nanoTime() - START) / 1_000_000, task,
                Thread.currentThread().getName());
        sleep(500);
    }

    static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
