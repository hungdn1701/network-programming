package netlab.stream;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.stub.StreamObserver;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import netlab.stream.lookup.LookupGrpc;
import netlab.stream.lookup.LookupReply;
import netlab.stream.lookup.LookupRequest;

/**
 * V27: bidirectional streaming. Async stub (newStub) trả về StreamObserver để client gửi từng khóa, cách nhau 300 ms; reply đến
 * qua một StreamObserver khác, xen giữa các lần gửi: hai chiều độc lập trên cùng một lời gọi.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.stream.BidiClient}
 */
public final class BidiClient {

    public static void main(String[] args) throws Exception {
        ManagedChannel channel = ManagedChannelBuilder.forAddress("127.0.0.1", 9199).usePlaintext().build();
        LookupGrpc.newBlockingStub(channel).lookup(LookupRequest.newBuilder().setKey("hanoi").build());  // thiết lập kết nối
        CountDownLatch done = new CountDownLatch(1);
        long start = System.nanoTime();
        StreamObserver<LookupRequest> requests = LookupGrpc.newStub(channel).lookupMany(new StreamObserver<>() {
            @Override
            public void onNext(LookupReply r) {
                System.out.printf("+%4d ms  received %s found=%s%n", ms(start), r.getKey(), r.getFound());
            }

            @Override
            public void onError(Throwable t) {
                System.out.println("error " + t);
                done.countDown();
            }

            @Override
            public void onCompleted() {
                System.out.printf("+%4d ms  server completed%n", ms(start));
                done.countDown();
            }
        });
        for (String key : new String[] {"hanoi", "atlantis", "huế"}) {
            System.out.printf("+%4d ms  sent %s%n", ms(start), key);
            requests.onNext(LookupRequest.newBuilder().setKey(key).build());
            Thread.sleep(300);
        }
        requests.onCompleted();  // client gửi xong
        done.await(5, TimeUnit.SECONDS);
        channel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
    }

    private static long ms(long start) {
        return (System.nanoTime() - start) / 1_000_000;
    }
}
