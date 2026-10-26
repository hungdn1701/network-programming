# UDP: datagram và DatagramSocket

Mã chạy được của phần “UDP: datagram và DatagramSocket”: UDP Pinger (Kurose và Ross, *Computer Networking*, Socket Programming Assignment 2) và một
truy vấn SNTP tới time server thật. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ
`results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần thư viện ngoài. `SntpClient` cần kết nối Internet tới
`time.google.com`, UDP port 123.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/udp/*.java

java -cp out netlab.udp.BoundaryDemo

java -cp out netlab.udp.PingServer          # terminal 1: UDP port 12000
java -cp out netlab.udp.PingClient          # terminal 2: 10 ping, chờ mỗi phản hồi tối đa 1 giây

java -cp out netlab.udp.ConnectedUdpDemo

java -cp out netlab.udp.SntpClient time.google.com       # buffer 48 byte: đọc được thời gian của server
java -cp out netlab.udp.SntpClient time.google.com 16    # buffer 16 byte: reply bị cắt, mất phần thời gian
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `BoundaryDemo` | slide 2 (lời giảng) | hai lần `send()` liền nhau, hai lần `receive()` riêng: datagram giữ ranh giới |
| `PingServer` | slide 4 | một `DatagramSocket` ở port 12000, mỗi vòng nhận một datagram và trả nội dung viết hoa về `getSocketAddress()` của request; như bài gốc, bỏ không trả lời khi số ngẫu nhiên từ 0 đến 10 nhỏ hơn 4 (seed 7: mất Ping 1, Ping 4) |
| `PingClient` | slide 5 | `setSoTimeout(1_000)` vì UDP không báo mất datagram; in RTT hoặc `request timed out` |
| `ConnectedUdpDemo` | slide 6 | `connect()` trên `DatagramSocket` tới `192.0.2.1` trả về ngay; sau `connect()`, datagram từ endpoint khác bị hệ điều hành bỏ |
| `SntpClient` | slide 7 | SNTP (RFC 4330): request, reply đều 48 byte; buffer 16 byte nhận 16 byte, không có ngoại lệ, phần Transmit Timestamp (byte 40–47) bị mất |

Kết quả chạy ngày 26/10/2026. RTT và thời điểm trong `PingClient` đổi theo lần chạy; với seed 7, lần chạy nào cũng mất
Ping 1 và Ping 4. Lần thử đầu với `pool.ntp.org` có lúc hết thời gian chờ (máy chủ trong pool không trả lời hoặc giới
hạn tần suất truy vấn), nên kết quả ghi với `time.google.com`.

Ghi chú về `setLength`: nhiều tài liệu cũ khuyên gọi `packet.setLength(buf.length)` trước mỗi lần `receive()` khi dùng lại
một `DatagramPacket`. Với JDK 21 điều này không cần: `receive()` dùng độ dài buffer đã đặt khi tạo packet, nên datagram sau
không bị cắt theo độ dài datagram trước (đã thử). Gọi `setLength(n)` với n nhỏ thì lại làm các lần nhận sau bị cắt ở n byte.
