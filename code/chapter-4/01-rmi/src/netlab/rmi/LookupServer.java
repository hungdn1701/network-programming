package netlab.rmi;

import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;
import java.rmi.server.UnicastRemoteObject;
import java.util.Map;

/**
 * V22: dịch vụ tra cứu qua Java RMI. Server hiện thực remote interface, export đối tượng ở port 9199 rồi đăng ký stub vào
 * RMI registry (port 1099) dưới tên "LookupService". Không có vòng lặp accept, không đọc ghi dòng: RMI runtime nhận lời gọi và gọi
 * phương thức lookup.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.rmi.LookupServer [độ trễ ms]}
 */
public final class LookupServer implements LookupService {

    private static final Map<String, String> DATA = Map.of(
            "hanoi", "Thủ đô của Việt Nam",
            "huế", "Cố đô triều Nguyễn");

    // giữ tham chiếu tới đối tượng và registry để chúng không bị thu gom khi main kết thúc
    private static LookupServer service;
    private static Registry registry;

    private final long delayMillis;

    private LookupServer(long delayMillis) {
        this.delayMillis = delayMillis;
    }

    @Override
    public String lookup(String key) {
        System.out.println("lookup(\"" + key + "\") on thread " + Thread.currentThread().getName());
        if (delayMillis > 0) {
            try {
                Thread.sleep(delayMillis);  // mô phỏng xử lý chậm (CrashDemo dùng để tắt server giữa lời gọi)
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        return DATA.get(key);
    }

    public static void main(String[] args) throws Exception {
        System.setProperty("java.rmi.server.hostname", "127.0.0.1");  // địa chỉ ghi vào stub
        long delay = args.length > 0 ? Long.parseLong(args[0]) : 0;
        service = new LookupServer(delay);
        LookupService stub = (LookupService) UnicastRemoteObject.exportObject(service, 9199);  // nhận lời gọi ở port 9199
        registry = LocateRegistry.createRegistry(1099);  // RMI registry chạy trong tiến trình server
        registry.rebind("LookupService", stub);  // đăng ký stub dưới tên "LookupService"
        System.out.println("bound \"LookupService\" in RMI registry on port 1099; object on port 9199");
    }
}
