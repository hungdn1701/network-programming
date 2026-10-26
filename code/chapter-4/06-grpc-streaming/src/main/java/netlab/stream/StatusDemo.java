package netlab.stream;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.StatusRuntimeException;
import java.util.concurrent.TimeUnit;
import netlab.stream.routeguide.Point;
import netlab.stream.routeguide.RouteGuideGrpc;

/**
 * V27: lời gọi gRPC thất bại trả về mã trạng thái. Vĩ độ ngoài [-90, 90] (kinh độ, vĩ độ bị đổi chỗ như ở phần trước):
 * INVALID_ARGUMENT (server chọn mã). Không có server ở port 9198: UNAVAILABLE (thư viện chọn mã). Cả hai đến dưới dạng
 * StatusRuntimeException.
 *
 * <p>Chạy (server đang chạy ở 9199): {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.stream.StatusDemo}
 */
public final class StatusDemo {

    public static void main(String[] args) throws Exception {
        call(9199, Features.point(1_057_871_000, 209_809_000));
        call(9198, Features.PTIT);
    }

    private static void call(int port, Point point) throws InterruptedException {
        ManagedChannel channel = ManagedChannelBuilder.forAddress("127.0.0.1", port).usePlaintext().build();
        try {
            RouteGuideGrpc.newBlockingStub(channel)
                    .withDeadlineAfter(2, TimeUnit.SECONDS)  // luôn đặt deadline: gRPC mặc định không có
                    .getFeature(point);
        } catch (StatusRuntimeException e) {
            System.out.println("port " + port + ", point " + Features.format(point) + ": " + e.getStatus().getCode()
                    + " (" + e.getStatus().getDescription() + ")");
        } finally {
            channel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
        }
    }
}
