# HTTP/2: binary framing và multiplexing

Mã chạy được của phần “HTTP/2: binary framing và multiplexing”: HTTP/2, binary framing và multiplexing. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết
quả chạy trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Server dùng Jetty 12.0.38 (HTTP/1.1 và HTTP/2 không mã hóa, h2c,
trên cùng port 9402); client dùng `java.net.http.HttpClient` của JDK, không cần thư viện.

**Thư viện** (`lib/`, không commit; tải từ Maven Central):

```bash
mkdir -p lib && cd lib
M=https://repo1.maven.org/maven2
for a in jetty-server jetty-http jetty-io jetty-util; do curl -O $M/org/eclipse/jetty/$a/12.0.38/$a-12.0.38.jar; done
for a in jetty-http2-server jetty-http2-common jetty-http2-hpack; do
  curl -O $M/org/eclipse/jetty/http2/$a/12.0.38/$a-12.0.38.jar
done
curl -O $M/org/slf4j/slf4j-api/2.0.17/slf4j-api-2.0.17.jar
curl -O $M/org/slf4j/slf4j-nop/2.0.17/slf4j-nop-2.0.17.jar      # tắt log của Jetty
cd ..
```

SHA-1 đã đối chiếu với Maven Central (2026-10-24):

| File | SHA-1 |
|---|---|
| `jetty-server-12.0.38.jar` | `1e0727781dc06110185e78ba7011378e5bd0a88a` |
| `jetty-http-12.0.38.jar` | `44efb1eab4321872201bac88988188a23e82873b` |
| `jetty-io-12.0.38.jar` | `1cb7096d7c24f585a75831e61748649c2e7c9856` |
| `jetty-util-12.0.38.jar` | `4d2620f90ee2eeb18354f78149d79781826d33fb` |
| `jetty-http2-server-12.0.38.jar` | `6e05645fb1b89079e1f2521820afb2f8205f3431` |
| `jetty-http2-common-12.0.38.jar` | `645d65055c317f30808ef575c85ac82b4766fa19` |
| `jetty-http2-hpack-12.0.38.jar` | `1311be05eee71fb448dad4065a7642d35bf0e1e5` |
| `slf4j-api-2.0.17.jar` | `d9e58ac9c7779ba3bf8142aff6c830617a7fe60f` |
| `slf4j-nop-2.0.17.jar` | `b41773047e10359aa409e7197c7624aeabfd377c` |

```bash
javac --release 21 -encoding UTF-8 -cp "lib/*" -d out src/netlab/h2/*.java

java -cp "out;lib/*" netlab.h2.ResourceServer      # terminal 1 (Linux, macOS: "out:lib/*")
java -cp out netlab.h2.ParallelFetch 2             # terminal 2: HTTP/2
java -cp out netlab.h2.ParallelFetch 1.1           # terminal 2: ép HTTP/1.1, tối đa 6 request cùng lúc
java -cp out netlab.h2.ParallelFetch 1.1 20        # terminal 2: HTTP/1.1, không giới hạn (20 request cùng lúc)
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `ResourceServer` | slide 4 (lời giảng) | `ServerConnector` với `HttpConnectionFactory` và `HTTP2CServerConnectionFactory`: HTTP/1.1 và h2c cùng port; tài nguyên `/r<n>` trả sau 200 ms; đếm request theo port của client (mỗi port một kết nối TCP); `/reset`, `/stats` |
| `ParallelFetch` | slide 4, 5 | `HttpClient.newBuilder().version(HTTP_2)`; request đầu nâng cấp kết nối lên h2c; 20 request trên virtual thread; với HTTP/1.1, `Semaphore` mặc định 6 chỗ giới hạn 6 request cùng lúc như trình duyệt; đối số thứ hai đổi giới hạn |

Kết quả một lần chạy (2026-10-24, cùng máy): HTTP/2 261 ms trên 1 kết nối; HTTP/1.1 tối đa 6 request cùng lúc 863 ms trên 6
kết nối; HTTP/1.1 không giới hạn (`ParallelFetch 1.1 20`) 267 ms trên 20 kết nối. Số mili giây thay đổi giữa các lần chạy;
số kết nối và số lượt (4 lượt × 200 ms so với 1 lượt) thì ổn định.

Trình duyệt chỉ dùng HTTP/2 qua TLS (`h2`, chọn bằng ALPN trong handshake TLS); h2c ở đây để chạy cục bộ không cần chứng chỉ.
Với `http://` và phiên bản HTTP/2, `HttpClient` gửi request đầu bằng HTTP/1.1 kèm `Upgrade: h2c`; server đồng ý thì kết nối
chuyển sang HTTP/2, các request sau dùng lại kết nối đó. HttpClient không tự giới hạn số kết nối HTTP/1.1: với 20 request đồng
thời, nó mở 20 kết nối (đã thử, kết quả trên).
