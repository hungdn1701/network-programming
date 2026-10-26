# gRPC: Protocol Buffers và lời gọi unary

Mã chạy được của phần “gRPC: Protocol Buffers và lời gọi unary”: RouteGuide, ví dụ mẫu của gRPC (grpc.io; `grpc-java/examples/routeguide`), phần RPC unary
`GetFeature`. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/` (output thật, không gõ
lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. grpc-java 1.84.3 (`grpc-netty-shaded`, `grpc-protobuf`, `grpc-stub`),
protobuf 3.25.9, qua Maven Wrapper (`mvnw`, tự tải Maven 3.9.16; không cần cài Maven). `protobuf-maven-plugin` 0.6.1 tải `protoc`
và `protoc-gen-grpc-java` đúng hệ điều hành (nhờ `os-maven-plugin`) rồi sinh mã vào `target/generated-sources/protobuf/` lúc build.
Kết quả có chữ tiếng Việt nên chạy với `-Dstdout.encoding=UTF-8` (console Windows: chạy `chcp 65001` trước).

```bash
sh mvnw -q package dependency:copy-dependencies -DincludeScope=runtime    # Windows cmd: mvnw.cmd ...

CP="target/classes;target/dependency/*"                                 # Linux, macOS: "target/classes:target/dependency/*"
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.grpc.RouteGuideServer     # terminal 1
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.grpc.RouteGuideClient     # terminal 2
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.grpc.SizeDemo
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.grpc.CompatDemo
```

| File | Dùng ở | Cho thấy |
|---|---|---|
| `src/main/proto/route_guide.proto` | slide 2, 4 | hợp đồng: `service RouteGuide` với RPC unary `GetFeature(Point) returns (Feature)`; `Point { int32 latitude = 1; int32 longitude = 2; }`, `Feature { string name = 1; Point location = 2; }` — như bản gốc, chỉ giữ phần dùng ở phần này |
| `Features` | — | tám địa danh ở Hà Nội thay cho `route_guide_db.json` (New Jersey) của bản gốc; tọa độ E7 (độ × 10^7) |
| `RouteGuideServer` | slide 5 | `RouteGuideService extends RouteGuideGrpc.RouteGuideImplBase`; trả Feature bằng `onNext` rồi `onCompleted`; không có địa danh → `name` rỗng; `ServerBuilder.forPort(9199)` |
| `RouteGuideClient` | slide 6 | `ManagedChannelBuilder.forAddress(...).usePlaintext()` (h2c); `RouteGuideGrpc.newBlockingStub(channel)`; `stub.getFeature(point)` với tọa độ Học viện và điểm (0, 0), như client mẫu |
| `SizeDemo` | slide 3 (hình) | byte của `Point`: `08 e8 dc 85 64 10 98 a9 b7 f8 03` (tag trường 1 kiểu varint, 4 byte vĩ độ, tag trường 2, 5 byte kinh độ), 11 byte so với 45 byte JSON; `Feature` 66 so với 119 byte (JSON in bằng `JsonFormat` của `protobuf-java-util`) |
| `src/main/proto/compat.proto`, `CompatDemo` | slide 7 | client cũ đọc byte của server đổi số `latitude`, `longitude` → vĩ độ 105.7871, không ngoại lệ; server thêm trường số 3 → client cũ đọc đúng, 1 trường lạ |

Tag là một varint `(số trường << 3) | kiểu`: `08` = trường 1, kiểu 0 (varint: int32, int64, bool); `10` = trường 2, kiểu 0; `0a`,
`12` = trường 1, 2, kiểu 2 (length-delimited: chuỗi, bytes, message con). Varint ghi 7 bit mỗi byte, bit cao báo còn byte sau.
Protocol Buffers phiên bản 3 không có null: trường không gán mang giá trị mặc định (chuỗi rỗng, 0), và giá trị mặc định không
được ghi vào byte.

Tọa độ địa danh lấy từ OpenStreetMap qua Nominatim (2026-10-25; © OpenStreetMap contributors, ODbL), làm tròn 4 chữ số thập
phân — đủ để minh họa, không dùng để dẫn đường.

`mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties` như phần SOAP (maven-wrapper-distribution 3.3.4, bản `only-script`).
Thư viện và `protoc` tải về `~/.m2`, không commit; `target/` bị `.gitignore`.
