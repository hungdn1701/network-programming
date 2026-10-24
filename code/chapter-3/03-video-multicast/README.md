# Bài toán ứng dụng: truyền video theo nhóm multicast

Mã chạy được của phần “Bài toán ứng dụng: truyền video theo nhóm multicast”: truyền video theo nhóm multicast. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy
trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11; nguồn và ba máy nhận chạy trên cùng một máy, tham gia nhóm trên card
Wi-Fi (interface của đường đi mặc định, như phần multicast trước). Không cần thư viện ngoài.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/video/*.java

java -cp out netlab.video.VideoReceiver r1          # terminal 1: nhận từ đầu
java -cp out netlab.video.VideoReceiver r2 0.05     # terminal 2: mất gói mô phỏng 5%
java -cp out netlab.video.VideoSender               # terminal 3: phát 100 khung hình trong 10 giây
java -cp out netlab.video.VideoReceiver r3          # terminal 4: chạy sau khi nguồn phát khoảng 5 giây
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `VideoSender` | slide 4 | mỗi khung hình (1 000 byte) thành một datagram 1 004 byte: số thứ tự 4 byte (`ByteBuffer.putInt`) rồi dữ liệu; nhịp 10 khung hình mỗi giây tính từ thời điểm bắt đầu; TTL 1 |
| `VideoReceiver` | slide 5, 6 | so số thứ tự với `expected`: lớn hơn là khoảng trống (đếm khung hình mất), nhỏ hơn là đến muộn (bỏ); khung hình đầu tiên nhận được là điểm bắt đầu; chờ nguồn tối đa 10 giây, sau khung hình đầu thì 2 giây không có gì là dừng |

**Mất gói mô phỏng.** Mạng cục bộ (và cùng một máy) hiếm khi mất gói, nên đối số thứ hai của `VideoReceiver` cho máy nhận tự
bỏ một tỉ lệ datagram đã nhận, chọn ngẫu nhiên với seed theo tên máy nhận (cùng tên thì cùng kết quả mô phỏng). Đây là mô
phỏng ở máy nhận, không phải mất gói thật trên mạng: các máy nhận khác vẫn nhận đủ, giống mất gói thật thường chỉ xảy ra trên
một đoạn mạng. Thời điểm r3 tham gia phụ thuộc lúc khởi động, nên khung hình đầu tiên của r3 có thể khác 53 ở lần chạy khác.

Khung hình ở đây là dữ liệu giả lập (1 000 byte cùng giá trị) để máy nhận kiểm tra độ dài; ứng dụng thật giải mã và vẽ khung
hình, và khung hình nén thường lớn hơn một datagram nên được chia thành nhiều gói (RTP, mục Mở rộng).
