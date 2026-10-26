# RPC: lời gọi thủ tục từ xa và Java RMI

Mã chạy được của phần “RPC: lời gọi thủ tục từ xa và Java RMI”: ngân hàng qua Java RMI (xem số dư tài khoản). Ví dụ ngân hàng là ví dụ mẫu của RPC trong Coulouris et
al., *Distributed Systems: Concepts and Design*. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ
`results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần thư viện ngoài: RMI nằm trong module `java.rmi` của JDK.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/rmi/*.java

java -cp out netlab.rmi.BankServer              # terminal 1: results/BankServer.txt
java -cp out netlab.rmi.BankClient 1001 9999    # terminal 2: results/BankClient.txt

java -cp out netlab.rmi.CrashDemo   # tự chạy server trong tiến trình con; tắt server trước khi chạy: results/CrashDemo.txt
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `Bank` | slide 4 | remote interface: kế thừa `java.rmi.Remote`; `balance` khai báo `RemoteException` (lỗi mạng) và `AccountNotFoundException` (lỗi nghiệp vụ) |
| `AccountNotFoundException` | slide 4, 6 | ngoại lệ nghiệp vụ, RMI chuyển về client nguyên vẹn |
| `BankServer` | slide 5 | `UnicastRemoteObject.exportObject(bank, 9199)` trả về stub; `LocateRegistry.createRegistry(1099)` chạy RMI registry trong tiến trình server; `rebind("Bank", stub)`; mỗi lời gọi chạy trên thread `RMI TCP Connection(...)` của RMI runtime |
| `BankClient` | slide 6 | `getRegistry` chỉ tạo stub của registry; `registry.lookup("Bank")` trả stub; lớp của stub là proxy do JDK sinh lúc chạy (`jdk.proxy1.$Proxy0`), tham chiếu trong stub ghi endpoint `127.0.0.1:9199`; tài khoản 9999 nhận `AccountNotFoundException` |
| `CrashDemo` | slide 7 | server trong tiến trình con, mỗi lời gọi mất 2 giây; tắt hẳn server sau 500 ms → `UnmarshalException` (server đã bắt đầu chạy `balance`); gọi lại → `ConnectException` |

Port: RMI registry dùng port mặc định 1099; đối tượng được export ở port 9199. Thuộc tính `java.rmi.server.hostname` quy định địa
chỉ ghi vào stub; không đặt thì RMI có thể ghi địa chỉ mạng LAN của máy, client trên cùng máy vẫn gọi được nhưng stub khó đọc hơn.

`objID` trong tham chiếu của stub thay đổi mỗi lần chạy server. Từ Java 5, stub được sinh lúc chạy (dynamic proxy), không cần
công cụ `rmic`; từ Java 1.2, phía server không cần lớp skeleton. Số dư dùng kiểu `long` (đồng); ứng dụng tài chính thật dùng kiểu
số thập phân chính xác và kiểm toán từng giao dịch.
