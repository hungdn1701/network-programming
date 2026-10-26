package netlab.rmi;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.rmi.RemoteException;
import java.rmi.registry.LocateRegistry;
import java.util.concurrent.CountDownLatch;

/**
 * V22: lời gọi từ xa thất bại vì server. Chạy server trong một tiến trình con với độ trễ 2 giây mỗi lời gọi; gọi balance và
 * tắt hẳn tiến trình server sau 500 ms, khi phương thức đang chạy; rồi gọi lại lần nữa khi server đã tắt.
 *
 * <p>Chạy: {@code java -cp out netlab.rmi.CrashDemo}
 */
public final class CrashDemo {

    public static void main(String[] args) throws Exception {
        String java = ProcessHandle.current().info().command().orElse("java");
        Process server = new ProcessBuilder(java, "-cp", System.getProperty("java.class.path"),
                "netlab.rmi.BankServer", "2000").redirectErrorStream(true).start();
        CountDownLatch bound = new CountDownLatch(1);
        Thread.ofPlatform().daemon().start(() -> {  // in log của server, báo khi server đã đăng ký tên
            try (BufferedReader in = new BufferedReader(new InputStreamReader(server.getInputStream(), StandardCharsets.UTF_8))) {
                for (String line; (line = in.readLine()) != null; ) {
                    System.out.println("  [server] " + line);
                    bound.countDown();
                }
            } catch (Exception ignored) {
                // tiến trình server đã tắt
            }
        });
        bound.await();
        Bank bank = (Bank) LocateRegistry.getRegistry("127.0.0.1", 1099).lookup("Bank");

        Thread.ofPlatform().start(() -> {
            sleep(500);
            server.destroyForcibly();  // tắt hẳn server khi balance đang chạy
            System.out.println("server process killed");
        });
        call(bank, 1);
        server.waitFor();
        call(bank, 2);
    }

    private static void call(Bank bank, int n) throws AccountNotFoundException {
        long start = System.nanoTime();
        try {
            System.out.println("call " + n + ": " + bank.balance("1001"));
        } catch (RemoteException e) {
            System.out.println("call " + n + " after " + (System.nanoTime() - start) / 1_000_000 + " ms: "
                    + e.getClass().getName());
            System.out.println("  cause: " + e.getCause());
        }
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
