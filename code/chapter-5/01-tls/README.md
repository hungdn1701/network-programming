# Bảo mật: TLS và secure socket trong Java

Mã chạy được của phần “Bảo mật: TLS và secure socket trong Java”: dịch vụ tra cứu qua TLS bằng `SSLServerSocket`, `SSLSocket`. Mọi đoạn mã trên slide trích từ thư
mục này; mọi kết quả chạy trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần thư viện ngoài; `keytool` đi kèm JDK. Kết quả có chữ tiếng Việt
nên chạy với `-Dstdout.encoding=UTF-8` (console Windows: chạy `chcp 65001` trước).

```bash
sh make-certs.sh                                    # tạo server.p12 (keystore), server.crt, client-trust.p12 (truststore)
javac --release 21 -encoding UTF-8 -d out src/netlab/tls/*.java
J="java -Dstdout.encoding=UTF-8 -cp out"

# 1. Bản rõ, đi qua Tap (máy trên đường truyền)
$J netlab.tls.LookupServer plain                    # terminal 1
$J netlab.tls.Tap                                   # terminal 2
$J netlab.tls.LookupClient plain localhost 9200 hanoi   # terminal 3

# 2. Bản TLS, đi qua Tap (chạy lại server với tls)
$J netlab.tls.LookupServer tls
$J netlab.tls.LookupClient tls localhost 9200 hanoi

# 3. Kiểm tra hostname và truststore (server TLS đang chạy)
$J netlab.tls.LookupClient tls 127.0.0.1 9199 hanoi                    # hostname không khớp: thất bại
$J netlab.tls.LookupClient tls-no-hostname-check 127.0.0.1 9199 hanoi  # không kiểm tra hostname: "thành công"
$J netlab.tls.LookupClient tls localhost 9199 hanoi --default-trust    # truststore mặc định của JDK: thất bại
```

| File | Dùng ở | Cho thấy |
|---|---|---|
| `make-certs.sh` | slide 5 | `keytool -genkeypair` (cặp khóa EC, chứng chỉ tự ký cho `CN=localhost`, `SAN=dns:localhost`), `-exportcert`, `-importcert` vào truststore của client |
| `Tap` | slide 2, 6 | nhận ở port 9200, chuyển tiếp nguyên byte tới 9199, in dạng chữ nếu là văn bản, dạng hex 16 byte đầu nếu không |
| `LookupServer` | slide 6 | bản TLS chỉ khác bản rõ ở `SSLServerSocketFactory.getDefault().createServerSocket(9199)` với keystore đặt qua `javax.net.ssl.keyStore` |
| `LookupClient` | slide 7 | `SSLSocketFactory`, truststore qua `javax.net.ssl.trustStore`; `setEndpointIdentificationAlgorithm("HTTPS")` bật kiểm tra hostname; in phiên bản TLS, bộ mã, tên trong chứng chỉ; thông báo lỗi cắt ở 90 ký tự |

Trong `results/tap-tls.txt`, bản ghi TLS bắt đầu bằng byte loại: `16` là handshake (ClientHello, ServerHello còn ở dạng rõ), `14`
là ChangeCipherSpec (TLS 1.3 giữ lại để tương thích với thiết bị mạng cũ), `17` là dữ liệu đã mã hóa — kể cả chứng chỉ của
server, khóa `hanoi` và phản hồi. Hai byte sau (`03 03`) là số phiên bản ghi trong bản ghi, giữ là TLS 1.2 vì tương thích; phiên
bản thật được thỏa thuận trong handshake (client in `TLSv1.3`).

`SSLSocket` kiểm tra chuỗi tin cậy nhưng không tự kiểm tra hostname: phải đặt endpoint identification algorithm (`HTTPS` hoặc
`LDAPS`). `HttpsURLConnection` và `HttpClient` của JDK bật sẵn việc này. Keystore và truststore (`*.p12`, `*.crt`) không commit:
chạy lại `make-certs.sh` để tạo; mật khẩu `changeit` chỉ dùng cho ví dụ.
