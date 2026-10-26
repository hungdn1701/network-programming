package netlab.async;

import io.grpc.ManagedChannel;
import io.grpc.Status;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import netlab.async.shop.PriceReply;
import netlab.async.shop.PriceRequest;
import netlab.async.shop.ShopGrpc;

/**
 * V32: tìm giá tốt nhất của một sản phẩm ở ba cửa hàng (best price finder, Modern Java in Action, ch. 16). Lần đầu dùng blocking
 * stub, hỏi lần lượt; lần sau dùng async stub, hỏi cả ba rồi chờ cùng lúc. Lỗi của một cửa hàng được thay bằng một báo giá "không
 * có" nhờ exceptionally, nên cửa hàng đó bị bỏ qua khi so giá.
 *
 * <p>Chạy (ShopServers đang chạy): {@code java -cp "target/classes;target/dependency/*" netlab.async.BestPriceFinder}
 */
public final class BestPriceFinder {

    static final String PRODUCT = "myPhone27S";

    /** Báo giá của một cửa hàng; cửa hàng lỗi có giá vô cùng, nên không bao giờ là giá thấp hơn. */
    record Quote(String shop, double price, Status.Code error) {

        static Quote unavailable(String shop, Throwable t) {
            return new Quote(shop, Double.POSITIVE_INFINITY, Status.fromThrowable(t).getCode());
        }

        Quote cheaper(Quote other) {
            return other.price < price ? other : this;
        }
    }

    public static void main(String[] args) throws Exception {
        ManagedChannel bestPriceShop = Prices.channel(9201, null);
        ManagedChannel letsSaveBigShop = Prices.channel(9202, null);
        ManagedChannel myFavoriteShop = Prices.channel(9203, null);
        List<ManagedChannel> all = List.of(bestPriceShop, letsSaveBigShop, myFavoriteShop);
        for (ManagedChannel c : all) {  // khởi động kết nối trước khi đo
            Prices.priceAsync(c, "warmup").exceptionally(t -> null).join();
        }

        long start = System.nanoTime();
        try {
            Quote best = null;
            for (ManagedChannel c : all) {
                PriceReply r = ShopGrpc.newBlockingStub(c).withDeadlineAfter(2, TimeUnit.SECONDS)
                        .getPrice(PriceRequest.newBuilder().setProduct(PRODUCT).build());  // chặn đến khi có reply
                System.out.printf("blocking  %s %.2f%n", r.getShop(), r.getPrice());
                Quote q = new Quote(r.getShop(), r.getPrice(), null);
                best = best == null ? q : best.cheaper(q);
            }
            System.out.printf("blocking  best %s %.2f, total %d ms%n", best.shop(), best.price(), ms(start));
        } catch (Exception e) {
            System.out.println("blocking  failed: " + Status.fromThrowable(e).getCode());
            System.out.printf("blocking  total %d ms%n", ms(start));
        }

        start = System.nanoTime();
        CompletableFuture<Quote> bestPrice = quote(bestPriceShop, "BestPrice");
        CompletableFuture<Quote> letsSaveBig = quote(letsSaveBigShop, "LetsSaveBig");
        CompletableFuture<Quote> myFavorite = quote(myFavoriteShop, "MyFavoriteShop");
        Quote cheapest = bestPrice.thenCombine(letsSaveBig, Quote::cheaper)  // ghép hai báo giá khi cả hai xong
                .thenCombine(myFavorite, Quote::cheaper)
                .get(2, TimeUnit.SECONDS);
        long total = ms(start);
        for (CompletableFuture<Quote> f : List.of(bestPrice, letsSaveBig, myFavorite)) {
            if (f.join().error() != null) {
                System.out.println("async     " + f.join().shop() + " skipped: " + f.join().error());
            }
        }
        System.out.printf("async     best %s %.2f, total %d ms%n", cheapest.shop(), cheapest.price(), total);
        for (ManagedChannel c : all) {
            c.shutdownNow();
        }
    }

    /** Hỏi giá một cửa hàng; lỗi của riêng lời gọi này được thay bằng báo giá "không có". */
    static CompletableFuture<Quote> quote(ManagedChannel channel, String shop) {
        return Prices.priceAsync(channel, PRODUCT)
                .thenApply(reply -> new Quote(shop, reply.getPrice(), null))
                .exceptionally(t -> Quote.unavailable(shop, t));  // lỗi → cửa hàng bị bỏ qua khi so giá
    }

    private static long ms(long start) {
        return (System.nanoTime() - start) / 1_000_000;
    }
}
