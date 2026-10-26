package netlab.grpc;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import java.util.concurrent.TimeUnit;
import netlab.grpc.routeguide.Feature;
import netlab.grpc.routeguide.Point;
import netlab.grpc.routeguide.RouteGuideGrpc;

/**
 * V26: client RouteGuide. ManagedChannel quản lý kết nối HTTP/2 tới server; blocking stub do protoc sinh gọi GetFeature như một
 * phương thức cục bộ và chặn thread gọi đến khi có kết quả. Hai điểm như client mẫu: một điểm có địa danh, điểm (0, 0) không có.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.grpc.RouteGuideClient}
 */
public final class RouteGuideClient {

    public static void main(String[] args) throws Exception {
        ManagedChannel channel = ManagedChannelBuilder.forAddress("127.0.0.1", 9199)
                .usePlaintext()  // HTTP/2 không mã hóa (h2c), chỉ để chạy cục bộ
                .build();
        RouteGuideGrpc.RouteGuideBlockingStub stub = RouteGuideGrpc.newBlockingStub(channel);
        for (Point point : new Point[] {Features.PTIT, Features.point(0, 0)}) {
            Feature feature = stub.getFeature(point);  // lời gọi unary qua blocking stub
            if (feature.getName().isEmpty()) {
                System.out.println("Found no feature at " + Features.format(feature.getLocation()));
            } else {
                System.out.println("Found feature called \"" + feature.getName() + "\" at " + Features.format(feature.getLocation()));
            }
        }
        channel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
    }
}
