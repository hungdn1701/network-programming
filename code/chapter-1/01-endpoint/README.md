# Định danh: địa chỉ IP, tên miền, port và endpoint

Mã chạy được của phần “Định danh: địa chỉ IP, tên miền, port và endpoint”. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ
`results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần Maven hay thư viện ngoài.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/endpoint/*.java
java -cp out netlab.endpoint.ResolveDemo
java -cp out netlab.endpoint.EndpointDemo
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `ResolveDemo` | slide 4 | `InetAddress.getAllByName("localhost")` trả hai địa chỉ: IPv4 và IPv6 |
| `EndpointDemo` | slide 5–6 | `InetSocketAddress` ghép địa chỉ với port; tên không phân giải được vẫn tạo được đối tượng, `isUnresolved()` trả `true`; tạo được endpoint không cho biết có chương trình nào chờ ở port |

Kết quả: `results/ResolveDemo.txt`, `results/EndpointDemo.txt`. Thứ tự IPv4 trước IPv6 là mặc định của Java
(`java.net.preferIPv6Addresses=false`); máy cấu hình khác có thể in khác.
