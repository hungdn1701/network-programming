package netlab.threads;

/**
 * V11: lỗi thường gặp. run() chỉ là lời gọi phương thức: tác vụ chạy trên thread hiện tại. start() mới tạo thread mới.
 * Thread.stop() không còn dùng được: từ Java 20, phương thức này ném UnsupportedOperationException.
 *
 * <p>Chạy: {@code java -cp out netlab.threads.StartVsRun}
 */
public final class StartVsRun {

    @SuppressWarnings("removal")
    public static void main(String[] args) throws InterruptedException {
        Runnable task = () -> System.out.println("task runs on " + Thread.currentThread().getName());
        Thread worker = new Thread(task, "worker");
        worker.run();    // gọi nhầm: chạy tác vụ trên thread hiện tại (main)
        worker.start();  // đúng: tạo thread mới tên worker
        worker.join();
        try {
            worker.stop();  // không còn dùng được trong Java 21
        } catch (UnsupportedOperationException e) {
            System.out.println("Thread.stop(): UnsupportedOperationException");
        }
    }
}
