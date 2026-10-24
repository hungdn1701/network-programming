# UDP: datagram và DatagramSocket

Mã chạy được của phần “UDP: datagram và DatagramSocket”: dịch vụ tra cứu, bản UDP. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên
slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần thư viện ngoài. Kết quả có chữ tiếng Việt nên chạy với
`-Dstdout.encoding=UTF-8` (console Windows: chạy `chcp 65001` trước). Khóa có dấu (như `huế`) nên gửi từ mã, không gõ ở
dòng lệnh Windows: đối số dòng lệnh không mang được chữ có dấu.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/udp/*.java

java -Dstdout.encoding=UTF-8 -cp out netlab.udp.UdpLookupServer          # terminal 1
java -Dstdout.encoding=UTF-8 -cp out netlab.udp.UdpLookupClient hanoi    # terminal 2
java -Dstdout.encoding=UTF-8 -cp out netlab.udp.UdpLookupClient atlantis
java -Dstdout.encoding=UTF-8 -cp out netlab.udp.UdpLookupClient hanoi 16 # buffer nhận 16 byte: phản hồi bị cắt

java -cp out netlab.udp.ConnectedUdpDemo
java -cp out netlab.udp.BoundaryDemo
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `BoundaryDemo` | slide 2 (lời giảng) | hai lần `send()` liền nhau, hai lần `receive()` riêng: datagram giữ ranh giới |
| `UdpLookupServer` | slide 4 | một `DatagramSocket` ở port 9199, mỗi vòng nhận một datagram và trả một datagram về `getSocketAddress()` của yêu cầu |
| `UdpLookupClient` | slide 5, 7 | `setSoTimeout(2_000)` vì UDP không báo mất datagram; buffer 16 byte: nhận 16 trong 30 byte, không có ngoại lệ |
| `ConnectedUdpDemo` | slide 6 | `connect()` trên `DatagramSocket` tới `192.0.2.1` trả về ngay; sau `connect()`, datagram từ endpoint khác bị hệ điều hành bỏ |

Giao thức tra cứu bản UDP: yêu cầu là một datagram chứa khóa (UTF-8, không có LF); phản hồi là một datagram chứa một trong
ba dạng `OK <giá trị>`, `NOTFOUND`, `ERR <lý do>` như bản TCP. Datagram tối đa 512 byte. Port 9199 của UDP và của TCP là
hai port riêng.

Ghi chú về `setLength`: nhiều tài liệu cũ khuyên gọi `packet.setLength(buf.length)` trước mỗi lần `receive()` khi dùng lại
một `DatagramPacket`. Với JDK 21 điều này không cần: `receive()` dùng độ dài buffer đã đặt khi tạo packet, nên datagram sau
không bị cắt theo độ dài datagram trước (đã thử). Gọi `setLength(n)` với n nhỏ thì lại làm các lần nhận sau bị cắt ở n byte.
