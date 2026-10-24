# Đa luồng: Executor, thread pool và virtual thread

Mã chạy được của phần “Đa luồng: Executor, thread pool và virtual thread”. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/`
(output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11, CPU 8 lõi. Không cần thư viện ngoài. Virtual thread có từ Java 21
(JEP 444).

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/pool/*.java

java -cp out netlab.pool.PoolDemo
java -cp out netlab.pool.VirtualThreadDemo
java -cp out netlab.pool.OverloadDemo
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `PoolDemo` | slide 4 | `ThreadPoolExecutor` 4 thread, hàng đợi 5, `CallerRunsPolicy`: tác vụ 1–4 chạy ngay, 5–9 chờ trong hàng đợi, tác vụ 10 chạy trên `main` |
| `VirtualThreadDemo` | slide 5 | 10 000 tác vụ chờ 1 giây trên `newVirtualThreadPerTaskExecutor()`: xong trong khoảng 1,1 giây, dùng 8 carrier thread (bằng số lõi) |
| `OverloadDemo` | slide 6 | `newFixedThreadPool(4)` dồn 1 996 tác vụ vào hàng đợi không giới hạn; `newCachedThreadPool()` tạo 2 000 thread; không cấu hình nào từ chối |

`VirtualThreadDemo` lấy tên carrier thread từ `toString()` của virtual thread (dạng
`VirtualThread[#22]/runnable@ForkJoinPool-1-worker-1`). Định dạng này là chi tiết hiện thực của JDK 21, chỉ dùng để
minh họa, không dùng trong mã thật.

Thứ tự các dòng cùng thời điểm trong `results/PoolDemo.txt` có thể khác giữa các lần chạy; tác vụ 10 luôn chạy trên `main`
vì nó được gửi khi bốn thread đều bận và hàng đợi đã đầy.

Con số "khoảng 2 500 giây" trong lời giảng là tính toán (10 000 tác vụ × 1 giây ÷ 4 thread), không chạy thật.
