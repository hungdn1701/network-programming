package netlab.stream;

import static java.lang.Math.atan2;
import static java.lang.Math.cos;
import static java.lang.Math.sin;
import static java.lang.Math.sqrt;
import static java.lang.Math.toRadians;

import io.grpc.Server;
import io.grpc.ServerBuilder;
import io.grpc.Status;
import io.grpc.stub.ServerCallStreamObserver;
import io.grpc.stub.StreamObserver;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.TimeUnit;
import netlab.stream.routeguide.Feature;
import netlab.stream.routeguide.Point;
import netlab.stream.routeguide.Rectangle;
import netlab.stream.routeguide.RouteGuideGrpc;
import netlab.stream.routeguide.RouteNote;
import netlab.stream.routeguide.RouteSummary;

/**
 * V27: server RouteGuide đầy đủ bốn kiểu RPC, theo server mẫu của grpc-java. ListFeatures (server streaming) gửi từng địa danh ngay
 * khi tìm được, mỗi địa danh mô phỏng tốn 300 ms, và dừng khi client hủy lời gọi hoặc hết deadline. GetFeature (unary) báo tọa độ
 * sai bằng mã INVALID_ARGUMENT. RecordRoute (client streaming) trả một bản tổng kết sau khi client gửi xong lộ trình. RouteChat
 * (bidirectional streaming) trả lại các ghi chú trước đó ở cùng điểm ngay khi nhận một ghi chú.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.stream.RouteGuideServer}
 */
public final class RouteGuideServer {

    static final class RouteGuideService extends RouteGuideGrpc.RouteGuideImplBase {

        private final ConcurrentMap<Point, List<RouteNote>> notes = new ConcurrentHashMap<>();

        @Override
        public void getFeature(Point request, StreamObserver<Feature> responseObserver) {
            if (Math.abs(request.getLatitude()) > 900_000_000) {  // lỗi đi bằng mã trạng thái, không bằng một trường trong message
                responseObserver.onError(Status.INVALID_ARGUMENT.withDescription(String.format(Locale.ROOT,
                        "latitude %.4f out of [-90, 90]", request.getLatitude() / 1e7)).asRuntimeException());
                return;
            }
            responseObserver.onNext(checkFeature(request));
            responseObserver.onCompleted();
        }

        @Override
        public void listFeatures(Rectangle request, StreamObserver<Feature> responseObserver) {
            ServerCallStreamObserver<Feature> call = (ServerCallStreamObserver<Feature>) responseObserver;
            int sent = 0;
            for (Feature feature : Features.ALL) {
                if (!inRange(feature.getLocation(), request)) {
                    continue;
                }
                sleep(300);  // mô phỏng mỗi địa danh tốn 300 ms để tìm
                if (call.isCancelled()) {  // client đã hủy hoặc hết deadline: dừng, không làm tiếp
                    System.out.println("ListFeatures: cancelled by client after " + sent + " features");
                    return;
                }
                call.onNext(feature);  // gửi ngay địa danh này
                sent++;
            }
            call.onCompleted();
            System.out.println("ListFeatures: completed, " + sent + " features");
        }

        @Override
        public StreamObserver<Point> recordRoute(StreamObserver<RouteSummary> responseObserver) {
            return new StreamObserver<>() {  // nhận từng điểm của lộ trình
                private final long start = System.nanoTime();
                private int pointCount;
                private int featureCount;
                private int distance;
                private Point previous;

                @Override
                public void onNext(Point point) {
                    pointCount++;
                    if (!checkFeature(point).getName().isEmpty()) {
                        featureCount++;
                    }
                    if (previous != null) {
                        distance += calcDistance(previous, point);
                    }
                    previous = point;
                }

                @Override
                public void onError(Throwable t) {
                    System.out.println("RecordRoute: client error " + Status.fromThrowable(t).getCode());
                }

                @Override
                public void onCompleted() {  // client gửi xong lộ trình: trả một bản tổng kết
                    long seconds = TimeUnit.NANOSECONDS.toSeconds(System.nanoTime() - start);
                    responseObserver.onNext(RouteSummary.newBuilder().setPointCount(pointCount).setFeatureCount(featureCount)
                            .setDistance(distance).setElapsedTime((int) seconds).build());
                    responseObserver.onCompleted();
                }
            };
        }

        @Override
        public StreamObserver<RouteNote> routeChat(StreamObserver<RouteNote> responseObserver) {
            return new StreamObserver<>() {  // nhận từng ghi chú, trả lời ngay, không chờ client gửi xong
                @Override
                public void onNext(RouteNote note) {
                    List<RouteNote> here = notes.computeIfAbsent(note.getLocation(),
                            k -> Collections.synchronizedList(new ArrayList<>()));
                    for (RouteNote previous : here.toArray(new RouteNote[0])) {  // các ghi chú trước đó ở cùng điểm
                        responseObserver.onNext(previous);
                    }
                    here.add(note);
                }

                @Override
                public void onError(Throwable t) {
                    System.out.println("RouteChat: client error " + Status.fromThrowable(t).getCode());
                }

                @Override
                public void onCompleted() {  // client gửi xong: server kết thúc chiều của mình
                    responseObserver.onCompleted();
                }
            };
        }
    }

    private static Feature checkFeature(Point location) {
        for (Feature feature : Features.ALL) {
            if (feature.getLocation().equals(location)) {
                return feature;
            }
        }
        return Features.feature("", location);
    }

    private static boolean inRange(Point p, Rectangle r) {
        int left = Math.min(r.getLo().getLongitude(), r.getHi().getLongitude());
        int right = Math.max(r.getLo().getLongitude(), r.getHi().getLongitude());
        int bottom = Math.min(r.getLo().getLatitude(), r.getHi().getLatitude());
        int top = Math.max(r.getLo().getLatitude(), r.getHi().getLatitude());
        return p.getLongitude() >= left && p.getLongitude() <= right && p.getLatitude() >= bottom && p.getLatitude() <= top;
    }

    /** Khoảng cách theo công thức haversine (mét), như server mẫu. */
    private static int calcDistance(Point start, Point end) {
        int r = 6_371_000;  // bán kính Trái Đất, mét
        double lat1 = toRadians(start.getLatitude() / 1e7);
        double lat2 = toRadians(end.getLatitude() / 1e7);
        double deltaLat = lat2 - lat1;
        double deltaLon = toRadians(end.getLongitude() / 1e7) - toRadians(start.getLongitude() / 1e7);
        double a = sin(deltaLat / 2) * sin(deltaLat / 2) + cos(lat1) * cos(lat2) * sin(deltaLon / 2) * sin(deltaLon / 2);
        return (int) (r * 2 * atan2(sqrt(a), sqrt(1 - a)));
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    public static void main(String[] args) throws Exception {
        Server server = ServerBuilder.forPort(9199).addService(new RouteGuideService()).build().start();
        System.out.println("gRPC server on port 9199, " + Features.ALL.size() + " features");
        server.awaitTermination();
    }
}
