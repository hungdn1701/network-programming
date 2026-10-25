# Độ tin cậy: retry, request ID và checksum trên UDP

Mã chạy được của phần “Độ tin cậy: retry, request ID và checksum trên UDP”: tra cứu qua UDP có retry, request ID và CRC32, trên một server giả lập mạng xấu. Mọi đoạn mã trên
slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần thư viện ngoài: CRC32 dùng `java.util.zip.CRC32`. Kết quả có
chữ tiếng Việt nên chạy với `-Dstdout.encoding=UTF-8`.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/reliable/*.java
java -Dstdout.encoding=UTF-8 -cp out netlab.reliable.LossyUdpServer                 # terminal 1: results/LossyUdpServer.txt
java -Dstdout.encoding=UTF-8 -cp out netlab.reliable.ReliableLookupClient 7         # terminal 2: results/ReliableLookupClient.txt
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `Message` | slide 4 | một message gọn trong một datagram: request ID (4 byte) · nội dung UTF-8 · CRC32 của hai phần trước (4 byte); `decode` tính lại CRC32, không khớp thì ném `CorruptException` |
| `ReliableLookupClient` | slide 5 | mỗi yêu cầu một request ID tăng dần; mỗi lần gửi chờ 300 ms (read timeout bằng thời gian còn lại), tối đa 3 lần gửi cùng ID; bỏ datagram sai CRC32 và phản hồi mang ID khác (phản hồi cũ đến muộn) |
| `LossyUdpServer` | slide 5, 6 | UDP port 9199; với mỗi yêu cầu: bỏ 30%, trả lời trễ 450 ms 15%, đổi một bit của phản hồi 10%, còn lại trả lời ngay; đếm số lần xử lý mỗi request ID |

Server dùng `java.util.Random` với seed cố định (mặc định 5, đổi bằng đối số đầu tiên), nên chạy lại cho cùng kịch bản: cùng thứ
tự datagram đến thì cùng chuỗi mất, trễ, hỏng. Seed 5 với 7 yêu cầu cho đủ các trường hợp: gửi lại thành công, phản hồi sai CRC32,
hết 3 lần gửi, phản hồi đến muộn bị bỏ qua, server xử lý một yêu cầu hai lần.

Server làm hỏng phản hồi **trước** khi gửi, nên checksum 16 bit của UDP (tính lúc gửi) vẫn đúng và chỉ CRC32 của message phát
hiện được. Đây là cách mô phỏng các lỗi lọt qua checksum của UDP: checksum 16 bit bỏ sót nhiều kiểu lỗi (đổi chỗ hai từ 16 bit,
lỗi bù nhau), và ở IPv4 bên gửi có thể không tính checksum (trường checksum bằng 0).
