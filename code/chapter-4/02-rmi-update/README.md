# RPC: truyền tham số, idempotency và truy cập đồng thời trong RMI

Mã chạy được của phần “RPC: truyền tham số, idempotency và truy cập đồng thời trong RMI”: ngân hàng qua Java RMI có chuyển tiền và rút tiền — truyền tham số, idempotency key, truy cập đồng
thời. Tiếp ví dụ ngân hàng của “RPC: lời gọi thủ tục từ xa và Java RMI” (ví dụ trong Coulouris et al., *Distributed Systems*). Mọi đoạn mã trên slide trích từ thư mục
này; mọi kết quả chạy trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần thư viện ngoài.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/bank/*.java

java -cp out netlab.bank.BankServer            # terminal 1
java -cp out netlab.bank.ParamDemo             # terminal 2
java -cp out netlab.bank.ConcurrentDemo

java -cp out netlab.bank.BankServer --pause    # terminal 1, chạy lại server với --pause
java -cp out netlab.bank.RetryDemo             # terminal 2
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `Transfer` | slide 2, 4 | lệnh chuyển tiền, lớp `Serializable`, trường sửa được: tham số được truyền theo giá trị |
| `Bank` | — | remote interface: `balance(account)`, `transfer(transfer, requestId)` trả số dư mới của tài khoản nguồn, `withdraw(account, amount)` |
| `BankServer` | slide 5, 6 | tài khoản 1001–1004; `transfer` dùng `processed.computeIfAbsent(requestId, ...)`: mỗi idempotency key chỉ chuyển tiền một lần; `withdraw` dùng `ConcurrentHashMap.compute`; đối tượng thứ hai `UnsafeBank` (cùng port 9199) đọc rồi ghi trên `HashMap` để so sánh; `--pause`: dừng 1,5 giây sau khi chuyển tiền, trước khi trả kết quả, ở lần chuyển đầu tiên từ mỗi tài khoản |
| `ParamDemo` | slide 4 | server ghi `DONE` vào tham số, `Transfer` của client vẫn `PENDING`; client sửa `amount` sau khi gửi, server không thấy |
| `RetryDemo` | slide 5 | client chờ tối đa 1 giây (`sun.rmi.transport.tcp.responseTimeout`), gặp `RemoteException` thì gọi lại một lần: không có key → tài khoản 1001 từ 5 000 000 còn 3 000 000 (chuyển hai lần), có key → 1003 từ 2 000 000 còn 1 000 000 |
| `ConcurrentDemo` | slide 6 | hai thread cùng rút tiền tài khoản 1004 (2 000 000), mỗi thread 1 000 lần × 1 000 đồng: `UnsafeBank` còn 41 000 trong một lần chạy (41 lần rút bị mất), `Bank` về đúng 0 |

`results/BankServer-pause.txt` là log server khi chạy `RetryDemo`: lệnh từ 1001 (không có key) có hai dòng `applied`, lệnh từ
1003 (có key) chỉ một dòng dù được gọi hai lần.

Số lần rút bị mất của `UnsafeBank` thay đổi giữa các lần chạy (và có thể bằng 0 trên máy ít lõi); bản dùng
`ConcurrentHashMap.compute` luôn đúng. `sun.rmi.transport.tcp.responseTimeout` là thuộc tính của RMI runtime trong JDK (mặc định
0, tức chờ không giới hạn); đặt bằng `System.setProperty` trước khi dùng RMI, hoặc `-D` trên dòng lệnh.

Mã được giản lược để tập trung vào ba cơ chế của phần: chuyển tiền cập nhật hai tài khoản bằng hai thao tác nguyên tử riêng
(không phải một giao dịch), không kiểm tra số dư âm, và server lưu idempotency key trong bộ nhớ, không bao giờ xóa. Hệ thống thật
cập nhật hai tài khoản trong một giao dịch, lưu key cùng dữ liệu (để còn sau khi khởi động lại) và xóa key sau một thời hạn.
