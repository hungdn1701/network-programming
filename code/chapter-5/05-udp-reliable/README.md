# Độ tin cậy: retry, request ID và checksum trên UDP

Mã chạy được của phần “Độ tin cậy: retry, request ID và checksum trên UDP”: truy vấn kiểu DNS qua UDP có retry, request ID 16 bit và CRC32, trên một server giả lập mạng xấu. Mọi đoạn mã trên
slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần thư viện ngoài: CRC32 dùng `java.util.zip.CRC32`.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/reliable/*.java
java -cp out netlab.reliable.LossyUdpServer         # terminal 1: results/LossyUdpServer.txt
java -cp out netlab.reliable.RetryResolver 7         # terminal 2: results/RetryResolver.txt
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `Message` | slide 4 | một message gọn trong một datagram: request ID 16 bit (2 byte, như trường ID của header DNS, RFC 1035 mục 4.1.1) · nội dung UTF-8 · CRC32 của hai phần trước (4 byte); `decode` tính lại CRC32, không khớp thì ném `CorruptException` |
| `RetryResolver` | slide 5 | hỏi tên miền như một resolver; mỗi truy vấn một request ID tăng dần; mỗi lần gửi chờ 300 ms (read timeout bằng thời gian còn lại), tối đa 3 lần gửi cùng ID; bỏ datagram sai CRC32 và phản hồi mang ID khác (phản hồi cũ đến muộn) |
| `LossyUdpServer` | slide 5, 6 | UDP port 9199, trả `A <địa chỉ>` hoặc `NXDOMAIN` cho `web.example`, `mail.example`, tên khác; với mỗi yêu cầu: bỏ 30%, trả lời trễ 450 ms 15%, đổi một bit của phản hồi 10%, còn lại trả lời ngay; đếm số lần xử lý mỗi request ID |

Server dùng `java.util.Random` với seed cố định (mặc định 5, đổi bằng đối số đầu tiên), nên chạy lại cho cùng kịch bản: cùng thứ
tự datagram đến thì cùng chuỗi mất, trễ, hỏng. Seed 5 với 7 truy vấn cho đủ các trường hợp: gửi lại thành công, phản hồi sai CRC32,
hết 3 lần gửi, phản hồi đến muộn bị bỏ qua, server xử lý một yêu cầu hai lần.

Server làm hỏng phản hồi **trước** khi gửi, nên checksum 16 bit của UDP (tính lúc gửi) vẫn đúng và chỉ CRC32 của message phát
hiện được. Đây là cách mô phỏng các lỗi lọt qua checksum của UDP: checksum 16 bit bỏ sót nhiều kiểu lỗi (đổi chỗ hai từ 16 bit,
lỗi bù nhau), và ở IPv4 bên gửi có thể không tính checksum (trường checksum bằng 0).

Tên miền nằm dưới TLD `.example` (RFC 2606) và địa chỉ thuộc dải TEST-NET (RFC 5737), nên không trùng tên hay địa chỉ thật. So với
DNS thật: DNS chạy ở port 53, message có header 12 byte và chỉ dựa vào checksum của UDP; message của ví dụ chỉ giữ trường ID và
thêm CRC32. Resolver thật chọn ID ngẫu nhiên (cùng port nguồn ngẫu nhiên) để khó bị giả mạo phản hồi (RFC 5452), còn ví dụ tăng ID
dần cho dễ đọc kết quả. Khi hết thời gian chờ, resolver gửi lại (RFC 1035 mục 4.2.1); resolver của glibc mặc định chờ 5 giây và thử
2 lần (`options timeout`, `attempts` trong `resolv.conf`). Message DNS trên UDP giới hạn 512 byte (RFC 1035 mục 2.3.4) để không bị
phân mảnh, đúng lý do ở slide 3.
