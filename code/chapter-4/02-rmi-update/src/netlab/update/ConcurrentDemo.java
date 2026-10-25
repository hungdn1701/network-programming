package netlab.update;

import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;

/**
 * V23: hai client cùng cập nhật một khóa, mỗi client 1 000 lần. Với UnsafeEntryService (HashMap, đọc rồi ghi), một số cập
 * nhật bị mất; với EntryService (ConcurrentHashMap.compute), version đúng bằng tổng số lần cập nhật.
 *
 * <p>Chạy (server đang chạy): {@code java -cp out netlab.update.ConcurrentDemo}
 */
public final class ConcurrentDemo {

    static final int PER_CLIENT = 1_000;

    public static void main(String[] args) throws Exception {
        Registry registry = LocateRegistry.getRegistry("127.0.0.1", 1099);
        for (String name : new String[] {"UnsafeEntryService", "EntryService"}) {
            EntryService service = (EntryService) registry.lookup(name);
            Thread a = Thread.ofPlatform().start(() -> updateMany(service, "a"));
            Thread b = Thread.ofPlatform().start(() -> updateMany(service, "b"));
            a.join();
            b.join();
            System.out.println(name + ": " + 2 * PER_CLIENT + " updates -> version " + service.lookup("hue").version);
        }
    }

    private static void updateMany(EntryService service, String client) {
        try {
            for (int i = 0; i < PER_CLIENT; i++) {
                service.update(new Entry("hue", "client " + client + " #" + i), null);
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
