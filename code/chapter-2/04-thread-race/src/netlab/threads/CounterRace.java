package netlab.threads;

/**
 * V11: race condition. Hai thread cùng tăng bộ đếm số yêu cầu, mỗi thread 1 000 000 lần, không đồng bộ hóa. Kết quả
 * thường nhỏ hơn 2 000 000 và khác nhau giữa các lần chạy: requests++ là đọc – sửa – ghi, hai thread xen kẽ thì mất lần
 * tăng. Mỗi lần chạy là một tiến trình JVM mới.
 *
 * <p>Chạy: {@code java -cp out netlab.threads.CounterRace 1} (đối số: nhãn lần chạy, không bắt buộc)
 */
public final class CounterRace {

    static int requests = 0;  // dữ liệu dùng chung: bộ đếm số yêu cầu của server

    public static void main(String[] args) throws InterruptedException {
        Runnable task = () -> {  // tác vụ: mô tả việc cần làm, chưa chạy
            for (int i = 0; i < 1_000_000; i++) {
                requests++;  // đọc – sửa – ghi, không đồng bộ hóa
            }
        };
        Thread a = new Thread(task, "worker-a");
        Thread b = new Thread(task, "worker-b");
        a.start();  // tạo thread mới, chạy task song song với main
        b.start();
        a.join();  // main chờ hai thread kết thúc
        b.join();
        String run = args.length > 0 ? "run " + args[0] + ": " : "";  // nhãn lần chạy, khi chạy nhiều lần liền nhau
        System.out.println(run + "requests = " + requests + " (expected 2000000)");
    }
}
