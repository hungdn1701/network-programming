package netlab.async;

import io.grpc.ManagedChannel;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * V32: callback chạy trên thread của thư viện. Ba kênh dùng chung một thread cho callback (như event loop của nhiều thư viện);
 * mỗi kết quả cần một thao tác chặn 500 ms (mô phỏng ghi đĩa). Làm thao tác đó ngay trong callback (thenApply) thì ba thao tác phải xếp
 * hàng trên thread duy nhất; chuyển sang executor riêng (thenApplyAsync) thì ba thao tác chạy song song.
 *
 * <p>Chạy (ShardServers đang chạy): {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.async.CallbackDemo}
 */
public final class CallbackDemo {

    public static void main(String[] args) throws Exception {
        ExecutorService callbackThread = Executors.newSingleThreadExecutor(r -> new Thread(r, "grpc-callback"));
        ExecutorService work = Executors.newFixedThreadPool(3, r -> new Thread(r, "work"));
        List<ManagedChannel> channels = List.of(Lookups.channel(9201, callbackThread),
                Lookups.channel(9202, callbackThread), Lookups.channel(9203, callbackThread));
        for (ManagedChannel c : channels) {
            Lookups.lookupAsync(c, "warmup").join();
        }
        run("blocking work in callback", channels, false, work);
        run("blocking work on own executor", channels, true, work);
        for (ManagedChannel c : channels) {
            c.shutdownNow();
        }
        callbackThread.shutdown();
        work.shutdown();
    }

    private static void run(String label, List<ManagedChannel> channels, boolean ownExecutor, ExecutorService work) {
        long start = System.nanoTime();
        String[] keys = {"hanoi", "sapa", "dalat"};
        CompletableFuture<?>[] all = new CompletableFuture<?>[3];
        for (int i = 0; i < 3; i++) {
            var reply = Lookups.lookupAsync(channels.get(i), keys[i]);
            all[i] = ownExecutor
                    ? reply.thenApplyAsync(CallbackDemo::slowSave, work)  // thao tác chặn chạy trên executor riêng
                    : reply.thenApply(CallbackDemo::slowSave);            // thao tác chặn chạy ngay trên thread callback
        }
        CompletableFuture.allOf(all).join();  // chờ cả ba
        System.out.printf("%-31s total %d ms%n", label, (System.nanoTime() - start) / 1_000_000);
    }

    private static String slowSave(Object reply) {
        try {
            Thread.sleep(500);  // mô phỏng I/O chặn: ghi kết quả xuống đĩa
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return Thread.currentThread().getName();
    }
}
