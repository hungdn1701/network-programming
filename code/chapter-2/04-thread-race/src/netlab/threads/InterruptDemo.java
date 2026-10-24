package netlab.threads;

/**
 * V11: dừng thread bằng interrupt. Thread worker chờ việc theo chu kỳ; main gửi yêu cầu dừng bằng interrupt(). Thread
 * đang chờ trong sleep nhận InterruptedException, dọn dẹp rồi tự kết thúc.
 *
 * <p>Chạy: {@code java -cp out netlab.threads.InterruptDemo}
 */
public final class InterruptDemo {

    public static void main(String[] args) throws InterruptedException {
        Thread worker = new Thread(InterruptDemo::waitForWork, "worker");
        worker.start();
        Thread.sleep(2_500);
        worker.interrupt();  // yêu cầu dừng; worker tự quyết cách dừng
        worker.join();
        System.out.println("main: worker alive = " + worker.isAlive());
    }

    /** Tác vụ của worker: chờ việc theo chu kỳ, dừng khi nhận yêu cầu dừng. */
    static void waitForWork() {
        try {
            while (!Thread.currentThread().isInterrupted()) {  // kiểm tra trạng thái ngắt
                System.out.println("worker: waiting for work");
                Thread.sleep(1_000);  // thao tác chờ: ném InterruptedException khi bị ngắt
            }
        } catch (InterruptedException e) {  // yêu cầu dừng: dọn dẹp rồi kết thúc
            System.out.println("worker: interrupted, cleaning up");
        }
    }
}
