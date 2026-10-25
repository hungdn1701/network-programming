package netlab.update;

import java.rmi.RemoteException;
import java.rmi.registry.LocateRegistry;
import java.util.UUID;

/**
 * V23: gọi lại sau RemoteException, có và không có idempotency key. Client chờ kết quả tối đa 1 giây; server (chạy với
 * --pause) đã cập nhật nhưng dừng 1,5 giây trước khi trả kết quả, nên lần gọi đầu hết thời gian chờ và client gọi lại.
 *
 * <p>Chạy (server chạy với --pause): {@code java -Dstdout.encoding=UTF-8 -cp out netlab.update.RetryDemo}
 */
public final class RetryDemo {

    public static void main(String[] args) throws Exception {
        System.setProperty("sun.rmi.transport.tcp.responseTimeout", "1000");  // chờ kết quả tối đa 1 giây
        EntryService service = (EntryService) LocateRegistry.getRegistry("127.0.0.1", 1099).lookup("EntryService");

        System.out.println("no idempotency key:");
        updateWithRetry(service, new Entry("sapa", "Thị trấn vùng cao"), null);
        String requestId = UUID.randomUUID().toString().substring(0, 8);  // một key cho một thao tác, dùng lại khi gọi lại
        System.out.println("idempotency key " + requestId + ":");
        updateWithRetry(service, new Entry("dalat", "Thành phố ngàn hoa"), requestId);
    }

    static void updateWithRetry(EntryService service, Entry entry, String requestId) throws RemoteException {
        try {
            System.out.println("  attempt 1: version " + service.update(entry, requestId));
        } catch (RemoteException e) {  // không biết server đã cập nhật hay chưa
            System.out.println("  attempt 1: " + e.getClass().getSimpleName() + ", cause " + e.getCause());
            System.out.println("  attempt 2: version " + service.update(entry, requestId));  // gọi lại, cùng requestId
        }
    }
}
