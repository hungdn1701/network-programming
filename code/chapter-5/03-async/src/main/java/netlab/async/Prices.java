package netlab.async;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.stub.StreamObserver;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import netlab.async.shop.PriceReply;
import netlab.async.shop.PriceRequest;
import netlab.async.shop.ShopGrpc;

/** V32: kênh tới một cửa hàng, và bộ chuyển lời gọi qua async stub thành CompletableFuture. */
final class Prices {

    private Prices() {
    }

    static ManagedChannel channel(int port, Executor callbackExecutor) {
        ManagedChannelBuilder<?> b = ManagedChannelBuilder.forAddress("127.0.0.1", port).usePlaintext();
        if (callbackExecutor != null) {
            b.executor(callbackExecutor);  // thread chạy callback của kênh này
        }
        return b.build();
    }

    /** Hỏi giá qua async stub: trả về ngay một CompletableFuture, hoàn tất khi reply (hoặc lỗi) tới. */
    static CompletableFuture<PriceReply> priceAsync(ManagedChannel channel, String product) {
        CompletableFuture<PriceReply> future = new CompletableFuture<>();
        ShopGrpc.newStub(channel).getPrice(PriceRequest.newBuilder().setProduct(product).build(), new StreamObserver<>() {
            @Override
            public void onNext(PriceReply reply) {
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
