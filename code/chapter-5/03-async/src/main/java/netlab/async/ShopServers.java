package netlab.async;

import io.grpc.Server;
import io.grpc.ServerBuilder;
import io.grpc.stub.StreamObserver;
import java.util.ArrayList;
import java.util.List;
import netlab.async.shop.PriceReply;
import netlab.async.shop.PriceRequest;
import netlab.async.shop.ShopGrpc;

/**
 * V32: ba cửa hàng, mỗi cửa hàng một server gRPC báo giá sau một độ trễ mô phỏng (tên cửa hàng theo ví dụ best price finder của
 * Modern Java in Action): port 9201 BestPrice (100 ms), 9202 LetsSaveBig (200 ms), 9203 MyFavoriteShop (300 ms). Cửa hàng chậm
 * nhất lại có giá thấp nhất, nên muốn có giá tốt nhất thì phải chờ đủ cả ba. Ba server chạy chung một tiến trình cho gọn.
 * Đối số --without 9203 bỏ server đó, để mô phỏng một cửa hàng không trả lời.
 *
 * <p>Chạy: {@code java -cp "target/classes;target/dependency/*" netlab.async.ShopServers [--without 9203]}
 */
public final class ShopServers {

    record ShopInfo(int port, long delayMillis, String name, double price) {
    }

    static final List<ShopInfo> SHOPS = List.of(
            new ShopInfo(9201, 100, "BestPrice", 139.99),
            new ShopInfo(9202, 200, "LetsSaveBig", 129.99),
            new ShopInfo(9203, 300, "MyFavoriteShop", 124.99));

    public static void main(String[] args) throws Exception {
        String without = args.length > 1 && args[0].equals("--without") ? args[1] : "";
        List<Server> servers = new ArrayList<>();
        for (ShopInfo shop : SHOPS) {
            if (String.valueOf(shop.port()).equals(without)) {
                continue;
            }
            servers.add(ServerBuilder.forPort(shop.port()).addService(service(shop)).build().start());
            System.out.println("shop " + shop.name() + " on port " + shop.port() + ", delay " + shop.delayMillis() + " ms");
        }
        for (Server s : servers) {
            s.awaitTermination();
        }
    }

    private static ShopGrpc.ShopImplBase service(ShopInfo shop) {
        return new ShopGrpc.ShopImplBase() {
            @Override
            public void getPrice(PriceRequest request, StreamObserver<PriceReply> responseObserver) {
                try {
                    Thread.sleep(shop.delayMillis());  // mô phỏng thời gian xử lý của cửa hàng
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                responseObserver.onNext(PriceReply.newBuilder().setShop(shop.name()).setPrice(shop.price()).build());
                responseObserver.onCompleted();
            }
        };
    }
}
