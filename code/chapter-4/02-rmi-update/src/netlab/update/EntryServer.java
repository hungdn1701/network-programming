package netlab.update;

import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;
import java.rmi.server.UnicastRemoteObject;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * V23: dịch vụ tra cứu có thao tác cập nhật, qua RMI. Export hai đối tượng trên cùng port 9199: "EntryService" an toàn khi
 * nhiều thread gọi đồng thời (ConcurrentHashMap.compute), "UnsafeEntryService" đọc rồi ghi trên HashMap để so sánh.
 * RMI không quy định lời gọi chạy trên thread nào: hai client gọi cùng lúc thì hai thread cùng chạy update.
 *
 * <p>Với tùy chọn {@code --pause}, server dừng 1,5 giây sau khi cập nhật, trước khi trả kết quả, ở lần cập nhật đầu tiên của
 * mỗi khóa: mô phỏng một lần server chậm để client hết thời gian chờ và gọi lại (RetryDemo).
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.update.EntryServer [--pause]}
 */
public final class EntryServer implements EntryService {

    private final ConcurrentHashMap<String, Entry> data = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> processed = new ConcurrentHashMap<>();  // idempotency key → version
    private final Map<String, Entry> unsafeData = new HashMap<>();
    private final boolean unsafe;
    private final boolean pause;
    private final Set<String> paused = ConcurrentHashMap.newKeySet();

    // giữ tham chiếu để đối tượng và registry không bị thu gom khi main kết thúc
    private static EntryServer service;
    private static EntryServer unsafeService;
    private static Registry registry;

    private EntryServer(boolean unsafe, boolean pause) {
        this.unsafe = unsafe;
        this.pause = pause;
    }

    @Override
    public Entry lookup(String key) {
        return unsafe ? unsafeData.get(key) : data.get(key);
    }

    @Override
    public long update(Entry entry, String requestId) {
        if (pause) {
            System.out.println("update(" + entry.key + ", " + (requestId == null ? "no key" : "key " + requestId) + ")");
        }
        long version = requestId == null
                ? apply(entry)  // không có idempotency key: mỗi lời gọi là một lần cập nhật
                : processed.computeIfAbsent(requestId, id -> apply(entry));  // key đã xử lý: trả kết quả cũ
        if (pause && paused.add(entry.key)) {
            sleep(1_500);  // mô phỏng server chậm: đã cập nhật nhưng chưa trả kết quả
        }
        return version;
    }

    private long apply(Entry entry) {
        if (unsafe) {
            Entry old = unsafeData.get(entry.key);  // đọc rồi ghi: hai thread có thể đọc cùng một version
            unsafeData.put(entry.key, new Entry(entry.key, entry.value, old == null ? 1 : old.version + 1));
            return unsafeData.get(entry.key).version;
        }
        Entry stored = data.compute(entry.key,  // đọc và ghi nguyên tử cho từng khóa
                (k, old) -> new Entry(k, entry.value, old == null ? 1 : old.version + 1));
        entry.version = stored.version;  // sửa tham số: chỉ sửa bản sao ở server
        if (pause) {
            System.out.println("  applied: " + stored);
        }
        return stored.version;
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    public static void main(String[] args) throws Exception {
        System.setProperty("java.rmi.server.hostname", "127.0.0.1");
        boolean pause = args.length > 0 && args[0].equals("--pause");
        service = new EntryServer(false, pause);
        unsafeService = new EntryServer(true, false);
        registry = LocateRegistry.createRegistry(1099);
        registry.rebind("EntryService", UnicastRemoteObject.exportObject(service, 9199));
        registry.rebind("UnsafeEntryService", UnicastRemoteObject.exportObject(unsafeService, 9199));  // cùng port
        System.out.println("bound EntryService, UnsafeEntryService; object port 9199" + (pause ? "; --pause" : ""));
    }
}
