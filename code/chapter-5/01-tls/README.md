# Bảo mật: TLS và secure socket trong Java

Mã chạy được của phần “Bảo mật: TLS và secure socket trong Java”: echo server qua TLS bằng `SSLServerSocket`, `SSLSocket`; kiểm tra chứng chỉ của server HTTPS thật.
Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần thư viện ngoài; `keytool` đi kèm JDK. `TlsCheck` cần mạng;
kết quả trong `results/tls-check.txt` chạy ngày 2026-10-26 (chứng chỉ của các trang thật có thể đổi theo thời gian).

```bash
sh make-certs.sh                                    # tạo server.p12 (keystore), server.crt, client-trust.p12 (truststore)
javac --release 21 -encoding UTF-8 -d out src/netlab/tls/*.java
J="java -cp out"

# 1. Bản rõ, đi qua Tap (máy trên đường truyền)
$J netlab.tls.EchoServer plain                      # terminal 1
$J netlab.tls.Tap                                   # terminal 2
$J netlab.tls.EchoClient plain localhost 9200 hello # terminal 3

# 2. Bản TLS, đi qua Tap (chạy lại server với tls)
$J netlab.tls.EchoServer tls
$J netlab.tls.EchoClient tls localhost 9200 hello

# 3. Chứng chỉ HTTPS thật, truststore mặc định của JDK
$J netlab.tls.TlsCheck ptit.edu.vn expired.badssl.com wrong.host.badssl.com self-signed.badssl.com untrusted-root.badssl.com
$J netlab.tls.TlsCheck --no-hostname-check wrong.host.badssl.com   # không kiểm tra hostname: "thành công"
```

| File | Dùng ở | Cho thấy |
|---|---|---|
| `make-certs.sh` | slide 5 | `keytool -genkeypair` (cặp khóa EC, chứng chỉ tự ký cho `CN=localhost`, `SAN=dns:localhost`), `-exportcert`, `-importcert` vào truststore của client |
| `Tap` | slide 2, 6 | nhận ở port 9200, chuyển tiếp nguyên byte tới 9199, in dạng chữ nếu là văn bản, dạng hex 16 byte đầu nếu không |
| `EchoServer` | slide 6 | echo server theo dòng (RFC 862, như Chương 2); bản TLS chỉ khác bản rõ ở `SSLServerSocketFactory.getDefault().createServerSocket(9199)` với keystore đặt qua `javax.net.ssl.keyStore` |
| `EchoClient` | slide 6 | truststore qua `javax.net.ssl.trustStore`; `setEndpointIdentificationAlgorithm("HTTPS")` bật kiểm tra hostname; in phiên bản TLS, bộ mã, tên trong chứng chỉ |
| `TlsCheck` | slide 4, 7 | kết nối port 443, handshake với truststore mặc định (cacerts); thành công thì in chuỗi chứng chỉ server gửi (tên CN), thất bại thì in nguyên nhân gốc của `SSLHandshakeException` |

Trong `results/tap-tls.txt`, bản ghi TLS bắt đầu bằng byte loại: `16` là handshake (ClientHello, ServerHello còn ở dạng rõ), `14`
là ChangeCipherSpec (TLS 1.3 giữ lại để tương thích với thiết bị mạng cũ), `17` là dữ liệu đã mã hóa — kể cả chứng chỉ của
server và hai dòng `hello`. Hai byte sau (`03 03`) là số phiên bản ghi trong bản ghi, giữ là TLS 1.2 vì tương thích; phiên bản
thật được thỏa thuận trong handshake (client in `TLSv1.3`).

[badssl.com](https://badssl.com/) cố ý cấu hình sai chứng chỉ trên từng tên miền để thử client: `expired` (hết hạn từ 2015),
`wrong.host` (chứng chỉ `*.badssl.com`: ký tự đại diện chỉ thay một nhãn, nên không khớp `wrong.host.badssl.com`), `self-signed`,
`untrusted-root` (CA gốc không có trong cacerts). Cả bốn lần thất bại đều ném `SSLHandshakeException`; `TlsCheck` in nguyên nhân gốc
(`CertificateExpiredException`, `CertificateException`, `SunCertPathBuilderException`).

`SSLSocket` kiểm tra chuỗi tin cậy nhưng không tự kiểm tra hostname: phải đặt endpoint identification algorithm (`HTTPS` hoặc
`LDAPS`). `HttpsURLConnection` và `HttpClient` của JDK bật sẵn việc này. Keystore và truststore (`*.p12`, `*.crt`) không commit:
chạy lại `make-certs.sh` để tạo (xóa ba file cũ trước); mật khẩu `changeit` chỉ dùng cho ví dụ.
