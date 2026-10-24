# Multicast: nhóm multicast, network interface và TTL

Mã chạy được của phần “Multicast: nhóm multicast, network interface và TTL”: gửi và nhận multicast. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide
lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11, máy có card Wi-Fi (đường đi mặc định), card mạng ảo Hyper-V và card
VPN Tailscale. Không cần thư viện ngoài. Ba máy nhận chạy trên cùng một máy: `MulticastSocket` cho phép nhiều socket cùng
port 9300.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/multicast/*.java

java -cp out netlab.multicast.ListInterfaces                    # các interface hỗ trợ multicast, có IPv4

java -cp out netlab.multicast.MulticastReceiver r1              # terminal 1, 2, 3: r1, r2, r3
java -cp out netlab.multicast.MulticastReceiver r2
java -cp out netlab.multicast.MulticastReceiver r3
java -cp out netlab.multicast.MulticastReceiver r4 ethernet_32775   # tham gia trên card mạng ảo: không nhận gì
java -cp out netlab.multicast.MulticastSender                   # terminal cuối: phát 5 datagram
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `MulticastSender` | slide 4 | gửi tới nhóm `239.1.2.3:9300` với `setTimeToLive(1)`; mỗi datagram gửi một lần |
| `MulticastReceiver` | slide 5, 6 | `joinGroup(group, nic)` trên một network interface; mặc định là interface của đường đi mặc định; ba máy nhận cùng nhận đủ 5 datagram; tham gia trên card mạng ảo thì không nhận gì và không có ngoại lệ |
| `ListInterfaces` | đọc thêm, bài tập Mở rộng | liệt kê interface đang bật, hỗ trợ multicast, có địa chỉ IPv4 |

Tên interface (`wireless_32768`, `ethernet_32775`…) là tên Java đặt trên Windows và khác nhau giữa các máy: chạy
`ListInterfaces` để xem tên trên máy của bạn. Không nhận được gì: kiểm tra interface đã tham gia nhóm trước, rồi TTL, rồi
tường lửa (Windows Defender Firewall có thể chặn UDP vào cho chương trình `java` chưa được cho phép).

Nhóm `239.1.2.3` thuộc dải `239.0.0.0/8` dành cho phạm vi một tổ chức (RFC 2365); dải multicast IPv4 là `224.0.0.0/4`
(RFC 5771).
