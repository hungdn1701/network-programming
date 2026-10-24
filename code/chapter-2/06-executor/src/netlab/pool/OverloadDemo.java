package netlab.pool;

import java.util.concurrent.Executors;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * V13: hai cấu hình mặc định che giấu quá tải. Gửi 2 000 tác vụ chậm (mỗi tác vụ chờ 1 giây): newFixedThreadPool(4)
 * nhận hết, dồn vào hàng đợi không giới hạn; newCachedThreadPool() tạo thêm thread cho mỗi tác vụ. Không cấu hình nào
 * từ chối tác vụ.
 *
 * <p>Chạy: {@code java -cp out netlab.pool.OverloadDemo}
 */
public final class OverloadDemo {

    public static void main(String[] args) {
        var fixed = (ThreadPoolExecutor) Executors.newFixedThreadPool(4);  // hàng đợi không giới hạn
        var cached = (ThreadPoolExecutor) Executors.newCachedThreadPool();  // số thread không giới hạn
        Runnable slow = () -> PoolDemo.sleep(1_000);
        for (int i = 0; i < 2_000; i++) {
            fixed.execute(slow);
            cached.execute(slow);
        }
        System.out.println("fixed:  threads = " + fixed.getPoolSize() + ", queued tasks = " + fixed.getQueue().size());
        System.out.println("cached: threads = " + cached.getPoolSize() + ", queued tasks = " + cached.getQueue().size());
        fixed.shutdownNow();
        cached.shutdownNow();
    }
}
