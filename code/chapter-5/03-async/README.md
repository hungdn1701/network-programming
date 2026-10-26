# Hiệu năng: lời gọi không chặn với CompletableFuture và gRPC async stub

Mã chạy được của phần “Hiệu năng: lời gọi không chặn với CompletableFuture và gRPC async stub”: tìm giá tốt nhất của một sản phẩm ở ba cửa hàng (best price finder, Urma, Fusco, Mycroft, *Modern
Java in Action*, ch. 16) bằng gRPC async stub và `CompletableFuture`. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy
trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. grpc-java 1.84.3 (`grpc-netty-shaded`, `grpc-protobuf`, `grpc-stub`),
protobuf 3.25.9, qua Maven Wrapper như phần gRPC (“gRPC: Protocol Buffers và lời gọi unary”): `protobuf-maven-plugin` sinh mã từ `src/main/proto/shop.proto` lúc build.

```bash
sh mvnw -q package dependency:copy-dependencies -DincludeScope=runtime    # Windows cmd: mvnw.cmd ...

CP="target/classes;target/dependency/*"                                 # Linux, macOS: "target/classes:target/dependency/*"
java -cp "$CP" netlab.async.ShopServers                    # terminal 1: results/ShopServers.txt
java -cp "$CP" netlab.async.BestPriceFinder                # terminal 2: results/BestPriceFinder.txt
java -cp "$CP" netlab.async.CallbackDemo                   # terminal 2: results/CallbackDemo.txt

java -cp "$CP" netlab.async.ShopServers --without 9203     # terminal 1, chạy lại: results/ShopServers-without-9203.txt
java -cp "$CP" netlab.async.BestPriceFinder                # terminal 2: results/BestPriceFinder-down.txt
```

| File | Dùng ở | Cho thấy |
|---|---|---|
| `src/main/proto/shop.proto` | — | hợp đồng báo giá (`service Shop`, `GetPrice`, `PriceRequest`, `PriceReply`), package `netlab.async.shop` |
| `ShopServers` | slide 5, 6 | ba cửa hàng, mỗi cửa hàng một server gRPC trong cùng tiến trình: port 9201 `BestPrice` (báo giá sau 100 ms, 139,99), 9202 `LetsSaveBig` (200 ms, 129,99), 9203 `MyFavoriteShop` (300 ms, 124,99); `--without 9203` bỏ cửa hàng thứ ba |
| `Prices` | slide 4 | `priceAsync`: `ShopGrpc.newStub(channel)` (async stub), `StreamObserver` hoàn tất `CompletableFuture` trong `onNext`/`onError`; `channel(port, executor)` chọn thread chạy callback |
| `BestPriceFinder` | slide 5, 6 | hỏi lần lượt bằng blocking stub (deadline 2 giây), rồi hỏi song song: `quote` = `thenApply` (reply → báo giá) và `exceptionally` (lỗi → báo giá có giá lớn hơn mọi giá thật, cửa hàng bị bỏ qua), `thenCombine` với `Quote::cheaper`, `get(2, SECONDS)` |
| `CallbackDemo` | slide 7 | ba kênh chung một thread callback (`grpc-callback`); mỗi báo giá một thao tác chặn 500 ms (mô phỏng dịch vụ giảm giá chặn, như `Discount` trong sách): `thenApply` (chạy trên thread callback) so với `thenApplyAsync(..., work)` (executor riêng ba thread); chờ cả ba bằng `allOf` |

Cửa hàng chậm nhất có giá thấp nhất, nên muốn có giá tốt nhất thì phải chờ đủ cả ba: đúng tình huống mà gọi song song có lợi.

Trước khi đo, mỗi kênh gọi một lần (`warmup`) để thiết lập kết nối HTTP/2, nên thời gian đo chỉ gồm lời gọi. Thời gian trong
`results/` đổi đôi chút mỗi lần chạy; tỷ lệ giữ nguyên: hỏi lần lượt xấp xỉ tổng ba độ trễ (600 ms), hỏi song song xấp xỉ độ trễ lớn
nhất (300 ms).

Theo mặc định, gRPC chạy callback trên một thread pool dùng chung của thư viện. `CallbackDemo` chỉ định một thread duy nhất
(`ManagedChannelBuilder.executor`) để thấy rõ hậu quả của thao tác chặn trong callback, giống các thư viện chạy mọi callback trên một
event loop (Netty, Vert.x).

`mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties` như phần SOAP (maven-wrapper-distribution 3.3.4, bản `only-script`).
Thư viện và `protoc` tải về `~/.m2`, không commit; `target/` bị `.gitignore`.
