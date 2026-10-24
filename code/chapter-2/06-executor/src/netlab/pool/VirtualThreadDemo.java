package netlab.pool;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * V13: 10 000 tác vụ, mỗi tác vụ chờ 1 giây, mỗi tác vụ một virtual thread. Khi chờ, virtual thread nhả carrier thread,
 * nên cả 10 000 tác vụ xong trong khoảng 1 giây, trên một số ít carrier thread.
 *
 * <p>Chạy: {@code java -cp out netlab.pool.VirtualThreadDemo}
 */
public final class VirtualThreadDemo {

    public static void main(String[] args) {
        Set<String> carriers = ConcurrentHashMap.newKeySet();
        long start = System.nanoTime();
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {  // mỗi tác vụ một virtual thread
            for (int i = 0; i < 10_000; i++) {
                executor.submit(() -> {
                    carriers.add(carrierOf(Thread.currentThread()));
                    Thread.sleep(1_000);  // chờ: virtual thread nhả carrier thread
                    return null;
                });
            }
        }  // close(): chờ mọi tác vụ xong
        System.out.println("10000 tasks done in " + (System.nanoTime() - start) / 1_000_000 + " ms");
        System.out.println("carrier threads used: " + carriers.size()
                + " (CPU cores: " + Runtime.getRuntime().availableProcessors() + ")");
    }

    /** toString() của virtual thread có dạng VirtualThread[#22]/runnable@ForkJoinPool-1-worker-1: phần sau @ là carrier. */
    static String carrierOf(Thread thread) {
        String s = thread.toString();
        return s.substring(s.indexOf('@') + 1);
    }
}
