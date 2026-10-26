package netlab.rmi;

import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;
import java.rmi.server.UnicastRemoteObject;
import java.util.Map;

/**
 * V22: ngân hàng qua Java RMI. Server hiện thực remote interface, export đối tượng ở port 9199 rồi đăng ký stub vào RMI registry
 * (port 1099) dưới tên "Bank". Không có vòng lặp accept, không đọc ghi dòng: RMI runtime nhận lời gọi và gọi phương thức balance.
 *
 * <p>Chạy: {@code java -cp out netlab.rmi.BankServer [độ trễ ms]}
 */
public final class BankServer implements Bank {

    private static final Map<String, Long> ACCOUNTS = Map.of(
            "1001", 5_000_000L,
            "1002", 2_500_000L);

    // giữ tham chiếu tới đối tượng và registry để chúng không bị thu gom khi main kết thúc
    private static BankServer bank;
    private static Registry registry;

    private final long delayMillis;

    private BankServer(long delayMillis) {
        this.delayMillis = delayMillis;
    }

    @Override
    public long balance(String accountNo) throws AccountNotFoundException {
        System.out.println("balance(\"" + accountNo + "\") on thread " + Thread.currentThread().getName());
        if (delayMillis > 0) {
            try {
                Thread.sleep(delayMillis);  // mô phỏng xử lý chậm (CrashDemo dùng để tắt server giữa lời gọi)
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        Long amount = ACCOUNTS.get(accountNo);
        if (amount == null) {
            throw new AccountNotFoundException(accountNo);  // lỗi nghiệp vụ, không phải lỗi mạng
        }
        return amount;
    }

    public static void main(String[] args) throws Exception {
        System.setProperty("java.rmi.server.hostname", "127.0.0.1");  // địa chỉ ghi vào stub
        long delay = args.length > 0 ? Long.parseLong(args[0]) : 0;
        bank = new BankServer(delay);
        Bank stub = (Bank) UnicastRemoteObject.exportObject(bank, 9199);  // nhận lời gọi ở port 9199
        registry = LocateRegistry.createRegistry(1099);  // RMI registry chạy trong tiến trình server
        registry.rebind("Bank", stub);  // đăng ký stub dưới tên "Bank"
        System.out.println("bound \"Bank\" in RMI registry on port 1099; object on port 9199");
    }
}
