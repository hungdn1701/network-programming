# HTTP/3: QUIC và giao thức trên UDP

Mã chạy được của phần “HTTP/3: QUIC và giao thức trên UDP”: HTTP/3, QUIC và giao thức trên UDP. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả
chạy trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11, mạng Wi-Fi có Internet (UDP port 443 không bị chặn). Cả hai chương
trình gửi request tới server công khai `https://cloudflare-quic.com/`, trang thử nghiệm QUIC của Cloudflare; kết quả trong
`results/` chạy ngày 2026-10-24 và có thể khác ở lần chạy khác.

`HttpClient` của JDK 21 chưa hỗ trợ HTTP/3 (JDK 26 mới bổ sung, [JEP 517](https://openjdk.org/jeps/517)); curl trên máy
biên soạn (8.21.0 của Windows, 8.7.1 của Git for Windows) không có HTTP/2, HTTP/3. Vì vậy request HTTP/3 dùng Flupke, client
HTTP/3 viết bằng Java, chạy trên thư viện QUIC Kwik.

**Thư viện** (`lib/`, không commit; tải từ Maven Central; chỉ `Http3Get` cần):

```bash
mkdir -p lib && cd lib
M=https://repo1.maven.org/maven2
curl -O $M/tech/kwik/flupke/0.9.4/flupke-0.9.4.jar
curl -O $M/tech/kwik/kwik/0.10.8/kwik-0.10.8.jar
curl -O $M/tech/kwik/qpack/2.0.1/qpack-2.0.1.jar
curl -O $M/tech/kwik/agent15/3.1/agent15-3.1.jar
curl -O $M/at/favre/lib/hkdf/2.0.0/hkdf-2.0.0.jar
curl -O $M/com/io7m/repackage/io/whitfin/io.whitfin.siphash/2.0.1/io.whitfin.siphash-2.0.1.jar
cd ..
```

SHA-1 đã đối chiếu với Maven Central (2026-10-24):

| File | SHA-1 |
|---|---|
| `flupke-0.9.4.jar` | `2b687c3891d1cc20dbd5a6338d4a72ba20249111` |
| `kwik-0.10.8.jar` | `d8d63a72985938c89c159292fa1584517b855496` |
| `qpack-2.0.1.jar` | `eaf26ee147219460957ce9379750b634913d41f4` |
| `agent15-3.1.jar` | `bdb89a92c153bb8cabaf949bc17c451ae5b4efea` |
| `hkdf-2.0.0.jar` | `26394a6d64d6bfaf88954cf695e699ed9c66bfb9` |
| `io.whitfin.siphash-2.0.1.jar` | `b8be74bc6e0af4fc97c62b6a71274c7fbeed173d` |

```bash
javac --release 21 -encoding UTF-8 -cp "lib/*" -d out src/netlab/h3/*.java

java -cp out netlab.h3.AltSvcProbe              # HTTPS bằng JDK: HTTP/2 và header Alt-Svc
java -cp "out;lib/*" netlab.h3.Http3Get         # HTTP/3 qua QUIC (Linux, macOS: "out:lib/*")
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `AltSvcProbe` | slide 5 | `HttpClient` của JDK 21 qua TLS: ALPN chọn HTTP/2 (`version HTTP_2`); header `alt-svc: h3=":443"` báo có HTTP/3 ở port UDP 443 |
| `Http3Get` | slide 6 | `Http3Client` của Flupke kế thừa `java.net.http.HttpClient`, gửi cùng `HttpRequest`; thống kê kết nối QUIC của Kwik: số UDP datagram đã gửi, số gói mất (QUIC tự gửi lại), smoothed RTT |

`HttpResponse.version()` của Flupke trả `null` vì enum `HttpClient.Version` của JDK 21 chưa có `HTTP_3`; chương trình vì
vậy in "over HTTP/3" theo client đã dùng, không theo `version()`. Số datagram, số gói mất và RTT thay đổi theo mạng; ở các lần
thử ngày 2026-10-24: 54–72 datagram, 0–5 gói mất, RTT 27–34 ms (cloudflare-quic.com và www.google.com).
