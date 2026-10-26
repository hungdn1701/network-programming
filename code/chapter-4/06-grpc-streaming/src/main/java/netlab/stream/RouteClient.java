package netlab.stream;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import netlab.stream.routeguide.Point;
import netlab.stream.routeguide.RouteGuideGrpc;
import netlab.stream.routeguide.RouteNote;
import netlab.stream.routeguide.RouteSummary;

/**
 * V27: hai RPC có stream phía client, gọi qua async stub (newStub). RecordRoute (client streaming): gửi bốn điểm của một lộ trình,
 * nhận một bản tổng kết sau khi báo gửi xong. RouteChat (bidirectional streaming): gửi bốn ghi chú, ghi chú trước đó ở cùng điểm đến
 * xen giữa các lần gửi: hai chiều độc lập trên cùng một lời gọi.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.stream.RouteClient}
 */
public final class RouteClient {

    public static void main(String[] args) throws Exception {
        ManagedChannel channel = ManagedChannelBuilder.forAddress("127.0.0.1", 9199).usePlaintext().build();
        RouteGuideGrpc.newBlockingStub(channel).getFeature(Features.PTIT);  // thiết lập kết nối HTTP/2 trước khi đo
        RouteGuideGrpc.RouteGuideStub stub = RouteGuideGrpc.newStub(channel);  // async stub: cho RPC có stream phía client
        recordRoute(stub);
        routeChat(stub);
        channel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
    }

    static void recordRoute(RouteGuideGrpc.RouteGuideStub stub) throws InterruptedException {
        System.out.println("RecordRoute (client streaming):");
        CountDownLatch done = new CountDownLatch(1);
        long start = System.nanoTime();
        StreamObserver<Point> route = stub.recordRoute(new StreamObserver<>() {
            @Override
            public void onNext(RouteSummary s) {
                System.out.printf("+%4d ms  summary: %d points, %d features, %d m, %d s%n", ms(start),
                        s.getPointCount(), s.getFeatureCount(), s.getDistance(), s.getElapsedTime());
            }

            @Override
            public void onError(Throwable t) {
                System.out.println("  error " + Status.fromThrowable(t).getCode());
                done.countDown();
            }

            @Override
            public void onCompleted() {
                done.countDown();
            }
        });
        for (Point p : new Point[] {Features.VAN_MIEU, Features.LANG_BAC, Features.TRAN_QUOC, Features.LONG_BIEN}) {
            System.out.printf("+%4d ms  sent %s%n", ms(start), Features.format(p));
            route.onNext(p);
            Thread.sleep(400);
        }
        route.onCompleted();  // client gửi xong lộ trình: server mới trả tổng kết
        done.await(5, TimeUnit.SECONDS);
    }

    static void routeChat(RouteGuideGrpc.RouteGuideStub stub) throws InterruptedException {
        System.out.println("RouteChat (bidirectional streaming):");
        CountDownLatch done = new CountDownLatch(1);
        long start = System.nanoTime();
        StreamObserver<RouteNote> chat = stub.routeChat(new StreamObserver<>() {
            @Override
            public void onNext(RouteNote n) {
                System.out.printf("+%4d ms  received \"%s\" at %s%n", ms(start), n.getMessage(), Features.format(n.getLocation()));
            }

            @Override
            public void onError(Throwable t) {
                System.out.println("  error " + Status.fromThrowable(t).getCode());
                done.countDown();
            }

            @Override
            public void onCompleted() {
                System.out.printf("+%4d ms  server completed%n", ms(start));
                done.countDown();
            }
        });
        Point[] where = {Features.HOAN_KIEM, Features.HOAN_KIEM, Features.VAN_MIEU, Features.HOAN_KIEM};
        for (int i = 0; i < where.length; i++) {
            RouteNote note = RouteNote.newBuilder().setLocation(where[i]).setMessage("tin " + (i + 1)).build();
            System.out.printf("+%4d ms  sent \"%s\" at %s%n", ms(start), note.getMessage(), Features.format(where[i]));
            chat.onNext(note);
            Thread.sleep(300);
        }
        chat.onCompleted();  // client gửi xong
        done.await(5, TimeUnit.SECONDS);
    }

    private static long ms(long start) {
        return (System.nanoTime() - start) / 1_000_000;
    }
}
