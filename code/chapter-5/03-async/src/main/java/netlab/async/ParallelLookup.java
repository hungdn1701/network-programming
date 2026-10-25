package netlab.async;

import io.grpc.ManagedChannel;
import io.grpc.Status;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import netlab.async.lookup.LookupGrpc;
import netlab.async.lookup.LookupReply;
import netlab.async.lookup.LookupRequest;

/**
 * V32: tra ba khóa nằm trên ba shard. Lần đầu dùng blocking stub, gọi lần lượt; lần sau dùng async stub, gọi cả ba rồi chờ
 * cùng lúc. Lỗi của một shard được thay bằng giá trị mặc định nhờ exceptionally.
 *
 * <p>Chạy (ShardServers đang chạy): {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.async.ParallelLookup}
 */
public final class ParallelLookup {

    public static void main(String[] args) throws Exception {
        ManagedChannel hanoiShard = Lookups.channel(9201, null);
        ManagedChannel sapaShard = Lookups.channel(9202, null);
        ManagedChannel dalatShard = Lookups.channel(9203, null);
        List<ManagedChannel> all = List.of(hanoiShard, sapaShard, dalatShard);
        for (ManagedChannel c : all) {  // khởi động kết nối trước khi đo
            Lookups.lookupAsync(c, "warmup").exceptionally(t -> null).join();
        }

        long start = System.nanoTime();
        String[] keys = {"hanoi", "sapa", "dalat"};
        try {
            for (int i = 0; i < 3; i++) {
                LookupReply r = LookupGrpc.newBlockingStub(all.get(i)).withDeadlineAfter(2, TimeUnit.SECONDS)
                        .lookup(LookupRequest.newBuilder().setKey(keys[i]).build());  // chặn đến khi có reply
                System.out.println("blocking  " + keys[i] + " -> " + r.getValue());
            }
        } catch (Exception e) {
            System.out.println("blocking  failed: " + Status.fromThrowable(e).getCode());
        }
        System.out.printf("blocking  total %d ms%n", ms(start));

        start = System.nanoTime();
        CompletableFuture<String> hanoi = Lookups.lookupAsync(hanoiShard, "hanoi").thenApply(LookupReply::getValue);
        CompletableFuture<String> sapa = Lookups.lookupAsync(sapaShard, "sapa").thenApply(LookupReply::getValue);
        CompletableFuture<String> dalat = Lookups.lookupAsync(dalatShard, "dalat").thenApply(LookupReply::getValue)
                .exceptionally(t -> "(không tra được: " + Status.fromThrowable(t).getCode() + ")");  // lỗi → mặc định
        String combined = hanoi.thenCombine(sapa, (a, b) -> a + " | " + b)  // ghép hai kết quả khi cả hai xong
                .thenCombine(dalat, (ab, c) -> ab + " | " + c)
                .get(2, TimeUnit.SECONDS);
        System.out.println("async     " + combined);
        System.out.printf("async     total %d ms%n", ms(start));
        for (ManagedChannel c : all) {
            c.shutdownNow();
        }
    }

    private static long ms(long start) {
        return (System.nanoTime() - start) / 1_000_000;
    }
}
