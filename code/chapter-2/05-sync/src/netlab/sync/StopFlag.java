package netlab.sync;

/**
 * V12, đọc thêm: thay đổi không nhìn thấy được giữa các thread. Hai worker lặp cho đến khi thấy cờ dừng; main đặt
 * cả hai cờ bằng true sau 1 giây. Worker đọc biến thường có thể không bao giờ thấy giá trị mới (không có quan hệ
 * happens-before); worker đọc biến volatile thấy ngay.
 *
 * <p>Chạy: {@code java -cp out netlab.sync.StopFlag}
 */
public final class StopFlag {

    static boolean plainStop = false;  // biến thường: không đồng bộ hóa
    static volatile boolean volatileStop = false;  // volatile: lần ghi happens-before các lần đọc sau

    public static void main(String[] args) throws InterruptedException {
        Thread plain = new Thread(() -> {
            long spins = 0;
            while (!plainStop) {  // có thể đọc mãi giá trị cũ
                spins++;
            }
        }, "plain");
        Thread checked = new Thread(() -> {
            long spins = 0;
            while (!volatileStop) {
                spins++;
            }
        }, "volatile");
        plain.setDaemon(true);  // để JVM thoát được dù worker không dừng
        checked.setDaemon(true);
        plain.start();
        checked.start();
        Thread.sleep(1_000);
        plainStop = true;
        volatileStop = true;
        plain.join(2_000);
        checked.join(2_000);
        System.out.println("plain field:    worker still running after 2 s = " + plain.isAlive());
        System.out.println("volatile field: worker still running after 2 s = " + checked.isAlive());
    }
}
