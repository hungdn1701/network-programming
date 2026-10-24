package netlab.sync;

/**
 * V12: bộ đếm an toàn. Tăng và đọc bộ đếm trong phương thức synchronized: mỗi lần chỉ một thread giữ monitor của
 * counter, nên không mất lần tăng nào. Kết quả luôn là 2 000 000.
 *
 * <p>Chạy: {@code java -cp out netlab.sync.CounterSafe 1} (đối số: nhãn lần chạy, không bắt buộc)
 */
public final class CounterSafe {

    private int requests = 0;

    synchronized void increment() {  // critical section: mỗi lần một thread, giữ monitor của this
        requests++;
    }

    synchronized int get() {  // đọc cũng giữ cùng monitor: thấy giá trị mới nhất
        return requests;
    }

    public static void main(String[] args) throws InterruptedException {
        CounterSafe counter = new CounterSafe();
        Runnable task = () -> {
            for (int i = 0; i < 1_000_000; i++) {
                counter.increment();
            }
        };
        Thread a = new Thread(task, "worker-a");
        Thread b = new Thread(task, "worker-b");
        a.start();
        b.start();
        a.join();
        b.join();
        String run = args.length > 0 ? "run " + args[0] + ": " : "";
        System.out.println(run + "requests = " + counter.get() + " (expected 2000000)");
    }
}
