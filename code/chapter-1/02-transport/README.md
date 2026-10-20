# Giao vận: TCP, UDP và mô hình ứng dụng mạng

Mã chạy được của phần “Giao vận: TCP, UDP và mô hình ứng dụng mạng”. Kết quả trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần thư viện ngoài.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/transport/*.java

# Terminal 1: mở một server TCP ở 9199, kết nối sẵn tới nó, mở một endpoint UDP ở 9200, chờ 30 giây
java -cp out netlab.transport.TransportDemo

# Terminal 2 (trong 30 giây): quan sát bằng netstat
netstat -ano | findstr "9199 9200"      # Windows (observe.ps1)
ss -tuanp | grep -E '9199|9200'         # Linux
```

| Tệp | Dùng ở | Cho thấy |
|---|---|---|
| `TransportDemo` | slide 5 (chỉ để tạo trạng thái) | Mã socket học ở Chương 2 (TCP) và Chương 3 (UDP) |
| `observe.ps1` | slide 5 | TCP có trạng thái (`LISTENING`, `ESTABLISHED`, hai dòng vì hai đầu cùng máy); UDP chỉ có endpoint |

Kết quả: `results/netstat.txt`, `results/TransportDemo.txt`. Port client và PID khác nhau mỗi lần chạy.
