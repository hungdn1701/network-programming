package netlab.grpc;

import io.grpc.Server;
import io.grpc.ServerBuilder;
import io.grpc.stub.StreamObserver;
import netlab.grpc.routeguide.Feature;
import netlab.grpc.routeguide.Point;
import netlab.grpc.routeguide.RouteGuideGrpc;

/**
 * V26: server RouteGuide qua gRPC, chỉ có RPC unary GetFeature. Lớp hiện thực kế thừa RouteGuideGrpc.RouteGuideImplBase do protoc
 * sinh từ route_guide.proto; server gRPC (transport Netty, HTTP/2) nhận lời gọi ở port 9199.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.grpc.RouteGuideServer}
 */
public final class RouteGuideServer {

    static final class RouteGuideService extends RouteGuideGrpc.RouteGuideImplBase {
        @Override
        public void getFeature(Point request, StreamObserver<Feature> responseObserver) {
            System.out.println("GetFeature(" + Features.format(request) + ") on " + Thread.currentThread().getName());
            responseObserver.onNext(checkFeature(request));  // unary: gửi đúng một response
            responseObserver.onCompleted();  // rồi kết thúc lời gọi
        }

        private static Feature checkFeature(Point location) {
            for (Feature feature : Features.ALL) {
                if (feature.getLocation().equals(location)) {
                    return feature;
                }
            }
            return Features.feature("", location);  // không có địa danh: name rỗng
        }
    }

    public static void main(String[] args) throws Exception {
        Server server = ServerBuilder.forPort(9199)
                .addService(new RouteGuideService())
                .build()
                .start();
        System.out.println("gRPC server on port 9199, " + Features.ALL.size() + " features");
        server.awaitTermination();
    }
}
