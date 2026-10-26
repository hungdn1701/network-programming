package netlab.stream;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.StatusRuntimeException;
import java.util.Iterator;
import java.util.concurrent.TimeUnit;
import netlab.stream.routeguide.Feature;
import netlab.stream.routeguide.Rectangle;
import netlab.stream.routeguide.RouteGuideGrpc;

/**
 * V27: liệt kê địa danh trong một hình chữ nhật ở trung tâm Hà Nội qua server streaming. Blocking stub trả một Iterator: mỗi lần
 * next() nhận một địa danh ngay khi server gửi. Đối số (ms) đặt deadline cho lời gọi; hết deadline, client nhận DEADLINE_EXCEEDED.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.stream.ListClient [1000]}
 */
public final class ListClient {

    public static void main(String[] args) throws Exception {
        ManagedChannel channel = ManagedChannelBuilder.forAddress("127.0.0.1", 9199).usePlaintext().build();
        RouteGuideGrpc.RouteGuideBlockingStub stub = RouteGuideGrpc.newBlockingStub(channel);
        stub.getFeature(Features.PTIT);  // thiết lập kết nối HTTP/2 trước khi đo
        Rectangle center = Rectangle.newBuilder()
                .setLo(Features.point(210_200_000, 1_058_300_000)).setHi(Features.point(210_500_000, 1_058_600_000)).build();
        if (args.length > 0) {
            stub = stub.withDeadlineAfter(Long.parseLong(args[0]), TimeUnit.MILLISECONDS);  // deadline cho lời gọi
        }
        long start = System.nanoTime();
        try {
            Iterator<Feature> features = stub.listFeatures(center);
            while (features.hasNext()) {  // nhận dần: mỗi địa danh đến khi server gửi
                Feature f = features.next();
                System.out.printf("+%4d ms  %s%n", (System.nanoTime() - start) / 1_000_000, f.getName());
            }
            System.out.printf("+%4d ms  completed%n", (System.nanoTime() - start) / 1_000_000);
        } catch (StatusRuntimeException e) {
            System.out.printf("+%4d ms  %s%n", (System.nanoTime() - start) / 1_000_000, e.getStatus().getCode());
        }
        channel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
    }
}
