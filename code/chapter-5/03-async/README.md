# Hiệu năng: lời gọi không chặn với CompletableFuture và gRPC async stub

Mã chạy được của phần “Hiệu năng: lời gọi không chặn với CompletableFuture và gRPC async stub”: tra cứu song song trên ba server gRPC bằng async stub và `CompletableFuture`. Mọi đoạn mã trên slide
trích từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. grpc-java 1.84.3 (`grpc-netty-shaded`, `grpc-protobuf`, `grpc-stub`),
protobuf 3.25.9, qua Maven Wrapper như phần gRPC (“gRPC: Protocol Buffers và lời gọi unary”): `protobuf-maven-plugin` sinh mã từ `src/main/proto/lookup.proto` lúc build.

```bash
sh mvnw -q package dependency:copy-dependencies -DincludeScope=runtime    # Windows cmd: mvnw.cmd ...

CP="target/classes;target/dependency/*"                                 # Linux, macOS: "target/classes:target/dependency/*"
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.async.ShardServers              # terminal 1: results/ShardServers.txt
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.async.ParallelLookup            # terminal 2: results/ParallelLookup.txt
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.async.CallbackDemo              # terminal 2: results/CallbackDemo.txt

java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.async.ShardServers --without 9203   # terminal 1, chạy lại: results/ShardServers-without-9203.txt
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.async.ParallelLookup                # terminal 2: results/ParallelLookup-down.txt
```

| File | Dùng ở | Cho thấy |
|---|---|---|
| `src/main/proto/lookup.proto` | — | hợp đồng như phần gRPC (`service Lookup`, `LookupRequest`, `LookupReply`), package `netlab.async.lookup` |
| `ShardServers` | slide 5, 6 | ba server gRPC trong một tiến trình: port 9201 giữ `hanoi` (trả lời sau 100 ms), 9202 giữ `sapa` (200 ms), 9203 giữ `dalat` (300 ms); `--without 9203` bỏ server thứ ba |
| `Lookups` | slide 4 | `lookupAsync`: `LookupGrpc.newStub(channel)` (async stub), `StreamObserver` hoàn tất `CompletableFuture` trong `onNext`/`onError`; `channel(port, executor)` chọn thread chạy callback |
| `ParallelLookup` | slide 5, 6 | gọi lần lượt bằng blocking stub (deadline 2 giây), rồi gọi song song: `thenApply`, `exceptionally` (giá trị mặc định khi lỗi), `thenCombine`, `get(2, SECONDS)` |
| `CallbackDemo` | slide 7 | ba kênh chung một thread callback (`grpc-callback`); mỗi reply một thao tác chặn 500 ms: `thenApply` (chạy trên thread callback) so với `thenApplyAsync(..., work)` (executor riêng ba thread); chờ cả ba bằng `allOf` |

Trước khi đo, mỗi kênh gọi một lần (`warmup`) để thiết lập kết nối HTTP/2, nên thời gian đo chỉ gồm lời gọi. Thời gian trong
`results/` đổi đôi chút mỗi lần chạy; tỷ lệ giữ nguyên: gọi lần lượt xấp xỉ tổng ba độ trễ (600 ms), gọi song song xấp xỉ độ trễ lớn
nhất (300 ms).

Theo mặc định, gRPC chạy callback trên một thread pool dùng chung của thư viện. `CallbackDemo` chỉ định một thread duy nhất
(`ManagedChannelBuilder.executor`) để thấy rõ hậu quả của thao tác chặn trong callback, giống các thư viện chạy mọi callback trên một
event loop (Netty, Vert.x).

`mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties` như phần SOAP (maven-wrapper-distribution 3.3.4, bản `only-script`).
Thư viện và `protoc` tải về `~/.m2`, không commit; `target/` bị `.gitignore`.
