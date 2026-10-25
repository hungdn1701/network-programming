package netlab.async;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.stub.StreamObserver;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import netlab.async.lookup.LookupGrpc;
import netlab.async.lookup.LookupReply;
import netlab.async.lookup.LookupRequest;

/** V32: kênh tới một shard, và bộ chuyển lời gọi qua async stub thành CompletableFuture. */
final class Lookups {

    private Lookups() {
    }

    static ManagedChannel channel(int port, Executor callbackExecutor) {
        ManagedChannelBuilder<?> b = ManagedChannelBuilder.forAddress("127.0.0.1", port).usePlaintext();
        if (callbackExecutor != null) {
            b.executor(callbackExecutor);  // thread chạy callback của kênh này
        }
        return b.build();
    }

    /** Gọi Lookup qua async stub: trả về ngay một CompletableFuture, hoàn tất khi reply (hoặc lỗi) tới. */
    static CompletableFuture<LookupReply> lookupAsync(ManagedChannel channel, String key) {
        CompletableFuture<LookupReply> future = new CompletableFuture<>();
        LookupGrpc.newStub(channel).lookup(LookupRequest.newBuilder().setKey(key).build(), new StreamObserver<>() {
            @Override
            public void onNext(LookupReply reply) {
                future.complete(reply);  // callback: chạy trên thread của gRPC khi reply tới
            }

            @Override
            public void onError(Throwable t) {
                future.completeExceptionally(t);
            }

            @Override
            public void onCompleted() {
            }
        });
        return future;
    }
}
