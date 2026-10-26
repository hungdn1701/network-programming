# Định danh: địa chỉ IP, tên miền, port và endpoint

Mã chạy được của phần “Định danh: địa chỉ IP, tên miền, port và endpoint”. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ
`results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần Maven hay thư viện ngoài. Cần kết nối Internet để
phân giải `ptit.edu.vn` và `www.google.com`.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/endpoint/*.java
java -cp out netlab.endpoint.ResolveDemo localhost ptit.edu.vn www.google.com
java -cp out netlab.endpoint.EndpointDemo
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `ResolveDemo` | slide 4 | bản tối giản của `nslookup` (Harold, *Java Network Programming*, ch. 4): `InetAddress.getAllByName` trả mọi địa chỉ của mỗi tên, kèm loại IPv4 hay IPv6 |
| `EndpointDemo` | slide 5–6 | `InetSocketAddress` ghép địa chỉ với port: `ptit.edu.vn:443`, `localhost:9199`; tên không phân giải được (`ptit.invalid`) vẫn tạo được đối tượng, `isUnresolved()` trả `true`; tạo được endpoint không cho biết có chương trình nào chờ ở port |

Kết quả: `results/ResolveDemo.txt`, `results/EndpointDemo.txt`, chạy ngày 26/10/2026. Địa chỉ của `ptit.edu.vn` và
`www.google.com` có thể khác khi chạy lại; số địa chỉ của `www.google.com` tùy DNS server trả về. Thứ tự IPv4 trước
IPv6 là mặc định của Java (`java.net.preferIPv6Addresses=false`); máy cấu hình khác có thể in khác. Lúc chạy
`EndpointDemo`, không có chương trình nào lắng nghe ở port 9199 (`netstat -ano` không có dòng nào cho port này).
