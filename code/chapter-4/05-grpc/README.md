# gRPC: Protocol Buffers và lời gọi unary

Mã chạy được của phần “gRPC: Protocol Buffers và lời gọi unary”: dịch vụ tra cứu qua gRPC, hợp đồng bằng Protocol Buffers. Mọi đoạn mã trên slide trích từ thư mục
này; mọi kết quả chạy trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. grpc-java 1.84.3 (`grpc-netty-shaded`, `grpc-protobuf`, `grpc-stub`),
protobuf 3.25.9, qua Maven Wrapper (`mvnw`, tự tải Maven 3.9.16; không cần cài Maven). `protobuf-maven-plugin` 0.6.1 tải `protoc`
và `protoc-gen-grpc-java` đúng hệ điều hành (nhờ `os-maven-plugin`) rồi sinh mã vào `target/generated-sources/protobuf/` lúc build.

```bash
sh mvnw -q package dependency:copy-dependencies -DincludeScope=runtime    # Windows cmd: mvnw.cmd ...

CP="target/classes;target/dependency/*"                                 # Linux, macOS: "target/classes:target/dependency/*"
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.grpc.LookupServer                  # terminal 1
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.grpc.LookupClient hanoi atlantis   # terminal 2
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.grpc.SizeDemo
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.grpc.CompatDemo
```

| File | Dùng ở | Cho thấy |
|---|---|---|
| `src/main/proto/lookup.proto` | slide 2, 4 | hợp đồng: `service Lookup` với RPC unary `Lookup`; `LookupRequest { string key = 1; }`, `LookupReply { bool found = 1; string value = 2; }` |
| `LookupServer` | slide 5 | `LookupService extends LookupGrpc.LookupImplBase`; trả kết quả bằng `onNext` rồi `onCompleted`; `ServerBuilder.forPort(9199)` |
| `LookupClient` | slide 6 | `ManagedChannelBuilder.forAddress(...).usePlaintext()` (h2c); `LookupGrpc.newBlockingStub(channel)`; `stub.lookup(request)` |
| `SizeDemo` | slide 3 (hình) | byte của message: `0a 05 68 61 6e 6f 69` (tag trường 1 kiểu chuỗi, độ dài 5, `hanoi`), 7 byte so với 15 byte JSON; reply 31 so với 52 byte (JSON in bằng `JsonFormat` của `protobuf-java-util`) |
| `src/main/proto/compat.proto`, `CompatDemo` | slide 7 | client cũ đọc byte của server đổi số trường → `found=false`, 2 trường lạ, không ngoại lệ; server thêm trường số 3 → client cũ đọc đúng, 1 trường lạ |

Tag là một varint `(số trường << 3) | kiểu`: `0a` = trường 1, kiểu 2 (length-delimited: chuỗi, bytes, message con); `08` = trường 1,
kiểu 0 (varint: bool, int). Protocol Buffers phiên bản 3 không có null: trường không gán mang giá trị mặc định (chuỗi rỗng, `false`,
0), và giá trị mặc định không được ghi vào byte.

`mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties` như phần SOAP (maven-wrapper-distribution 3.3.4, bản `only-script`).
Thư viện và `protoc` tải về `~/.m2`, không commit; `target/` bị `.gitignore`.
