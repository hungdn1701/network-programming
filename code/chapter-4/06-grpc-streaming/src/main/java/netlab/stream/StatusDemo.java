package netlab.stream;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.StatusRuntimeException;
import java.util.concurrent.TimeUnit;
import netlab.stream.lookup.LookupGrpc;
import netlab.stream.lookup.LookupRequest;

/**
 * V27: lời gọi gRPC thất bại trả về mã trạng thái. Khóa không tồn tại: NOT_FOUND (server chọn mã). Không có server ở port
 * 9198: UNAVAILABLE (thư viện chọn mã). Cả hai đến dưới dạng StatusRuntimeException.
 *
 * <p>Chạy (server đang chạy ở 9199): {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.stream.StatusDemo}
 */
public final class StatusDemo {

    public static void main(String[] args) throws Exception {
        call(9199, "atlantis");
        call(9198, "hanoi");
    }

    private static void call(int port, String key) throws InterruptedException {
        ManagedChannel channel = ManagedChannelBuilder.forAddress("127.0.0.1", port).usePlaintext().build();
        try {
            LookupGrpc.newBlockingStub(channel)
                    .withDeadlineAfter(2, TimeUnit.SECONDS)  // luôn đặt deadline: gRPC mặc định không có
                    .lookup(LookupRequest.newBuilder().setKey(key).build());
        } catch (StatusRuntimeException e) {
            System.out.println("port " + port + ", key " + key + ": " + e.getStatus().getCode()
                    + " (" + e.getStatus().getDescription() + ")");
        } finally {
            channel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
        }
    }
}
