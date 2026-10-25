# RPC: lời gọi thủ tục từ xa và Java RMI

Mã chạy được của phần “RPC: lời gọi thủ tục từ xa và Java RMI”: dịch vụ tra cứu qua Java RMI. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên
slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần thư viện ngoài: RMI nằm trong module `java.rmi` của JDK. Kết
quả có chữ tiếng Việt nên chạy với `-Dstdout.encoding=UTF-8` (console Windows: chạy `chcp 65001` trước).

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/rmi/*.java

java -Dstdout.encoding=UTF-8 -cp out netlab.rmi.LookupServer                  # terminal 1
java -Dstdout.encoding=UTF-8 -cp out netlab.rmi.LookupClient hanoi atlantis   # terminal 2

java -Dstdout.encoding=UTF-8 -cp out netlab.rmi.CrashDemo   # tự chạy server trong tiến trình con; tắt server trước khi chạy
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `LookupService` | slide 4 | remote interface: kế thừa `java.rmi.Remote`, phương thức khai báo `RemoteException` |
| `LookupServer` | slide 5 | `UnicastRemoteObject.exportObject(service, 9199)` trả về stub; `LocateRegistry.createRegistry(1099)` chạy RMI registry trong tiến trình server; `rebind("LookupService", stub)`; mỗi lời gọi chạy trên thread `RMI TCP Connection(...)` của RMI runtime |
| `LookupClient` | slide 6 | `getRegistry` chỉ tạo stub của registry; `registry.lookup("LookupService")` trả stub của dịch vụ; lớp của stub là proxy do JDK sinh lúc chạy (`jdk.proxy1.$Proxy0`), tham chiếu trong stub ghi endpoint `127.0.0.1:9199` |
| `CrashDemo` | slide 7 | server trong tiến trình con, mỗi lời gọi mất 2 giây; tắt hẳn server sau 500 ms → `UnmarshalException` (server đã bắt đầu chạy `lookup`); gọi lại → `ConnectException` |

Port: RMI registry dùng port mặc định 1099; đối tượng dịch vụ được export ở port 9199, port của dịch vụ tra cứu từ Chương 2
(không chạy cùng lúc với server TCP của các phần trước). Thuộc tính `java.rmi.server.hostname` quy định địa chỉ ghi vào stub;
không đặt thì RMI có thể ghi địa chỉ mạng LAN của máy, client trên cùng máy vẫn gọi được nhưng stub khó đọc hơn.

`objID` trong tham chiếu của stub thay đổi mỗi lần chạy server. Từ Java 5, stub được sinh lúc chạy (dynamic proxy), không cần
công cụ `rmic`; từ Java 1.2, phía server không cần lớp skeleton.
