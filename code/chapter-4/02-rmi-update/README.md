# RPC: truyền tham số, idempotency và truy cập đồng thời trong RMI

Mã chạy được của phần “RPC: truyền tham số, idempotency và truy cập đồng thời trong RMI”: dịch vụ tra cứu có thao tác cập nhật qua Java RMI — truyền tham số, idempotency key, truy cập đồng
thời. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần thư viện ngoài. Kết quả có chữ tiếng Việt nên chạy với
`-Dstdout.encoding=UTF-8` (console Windows: chạy `chcp 65001` trước).

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/update/*.java

java -Dstdout.encoding=UTF-8 -cp out netlab.update.EntryServer          # terminal 1
java -Dstdout.encoding=UTF-8 -cp out netlab.update.ParamDemo            # terminal 2
java -cp out netlab.update.ConcurrentDemo

java -Dstdout.encoding=UTF-8 -cp out netlab.update.EntryServer --pause  # terminal 1, chạy lại server với --pause
java -Dstdout.encoding=UTF-8 -cp out netlab.update.RetryDemo            # terminal 2
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `Entry` | slide 2, 4 | lớp `Serializable`, trường sửa được: tham số được truyền theo giá trị |
| `EntryService` | — | remote interface: `lookup(key)`, `update(entry, requestId)` trả version sau khi cập nhật |
| `EntryServer` | slide 5, 6 | `update` dùng `processed.computeIfAbsent(requestId, ...)`: mỗi idempotency key chỉ áp dụng một lần; `apply` dùng `ConcurrentHashMap.compute`; đối tượng thứ hai `UnsafeEntryService` (cùng port 9199) đọc rồi ghi trên `HashMap` để so sánh; `--pause`: dừng 1,5 giây sau khi cập nhật, trước khi trả kết quả, ở lần cập nhật đầu tiên của mỗi khóa |
| `ParamDemo` | slide 4 | server ghi `version` vào tham số, `Entry` của client vẫn `version 0`; client sửa `value` sau khi gửi, server không thấy |
| `RetryDemo` | slide 5 | client chờ tối đa 1 giây (`sun.rmi.transport.tcp.responseTimeout`), gặp `RemoteException` thì gọi lại một lần: không có key → `version 2`, có key → `version 1` |
| `ConcurrentDemo` | slide 6 | hai thread cùng cập nhật khóa `hue`, mỗi thread 1 000 lần: `UnsafeEntryService` mất cập nhật (1938 trong một lần chạy), `EntryService` đúng 2000 |

`results/EntryServer-pause.txt` là log server khi chạy `RetryDemo`: khóa `sapa` (không có key) có hai dòng `applied`, khóa
`dalat` (có key) chỉ một dòng dù được gọi hai lần.

Số lần cập nhật bị mất của `UnsafeEntryService` thay đổi giữa các lần chạy (và có thể bằng 0 trên máy ít lõi); bản dùng
`ConcurrentHashMap.compute` luôn đúng. `sun.rmi.transport.tcp.responseTimeout` là thuộc tính của RMI runtime trong JDK (mặc định
0, tức chờ không giới hạn); đặt bằng `System.setProperty` trước khi dùng RMI, hoặc `-D` trên dòng lệnh.

Server lưu idempotency key trong bộ nhớ và không bao giờ xóa: đủ cho demo. Hệ thống thật lưu key cùng dữ liệu (để còn sau khi
khởi động lại) và xóa key sau một thời hạn.
