package netlab.bank;

import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;
import java.rmi.server.UnicastRemoteObject;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * V23: ngân hàng qua RMI, có chuyển tiền và rút tiền. Export hai đối tượng trên cùng port 9199: "Bank" an toàn khi nhiều thread gọi
 * đồng thời (ConcurrentHashMap.compute), "UnsafeBank" đọc rồi ghi trên HashMap để so sánh. RMI không quy định lời gọi chạy trên
 * thread nào: hai client gọi cùng lúc thì hai thread cùng chạy withdraw.
 *
 * <p>Với tùy chọn {@code --pause}, server dừng 1,5 giây sau khi chuyển tiền, trước khi trả kết quả, ở lần chuyển đầu tiên từ mỗi tài
 * khoản: mô phỏng một lần server chậm để client hết thời gian chờ và gọi lại (RetryDemo).
 *
 * <p>Chạy: {@code java -cp out netlab.bank.BankServer [--pause]}
 */
public final class BankServer implements Bank {

    private static final Map<String, Long> INITIAL = Map.of(
            "1001", 5_000_000L, "1002", 2_500_000L, "1003", 2_000_000L, "1004", 2_000_000L);

    private final ConcurrentHashMap<String, Long> accounts = new ConcurrentHashMap<>(INITIAL);
    private final ConcurrentHashMap<String, Long> processed = new ConcurrentHashMap<>();  // idempotency key → kết quả
    private final Map<String, Long> unsafeAccounts = new HashMap<>(INITIAL);
    private final boolean unsafe;
    private final boolean pause;
    private final Set<String> paused = ConcurrentHashMap.newKeySet();

    // giữ tham chiếu để đối tượng và registry không bị thu gom khi main kết thúc
    private static BankServer bank;
    private static BankServer unsafeBank;
    private static Registry registry;

    private BankServer(boolean unsafe, boolean pause) {
        this.unsafe = unsafe;
        this.pause = pause;
    }

    @Override
    public long balance(String account) {
        return unsafe ? unsafeAccounts.get(account) : accounts.get(account);
    }

    @Override
    public long transfer(Transfer transfer, String requestId) {
        if (pause) {
            System.out.println("transfer(" + transfer.from + " -> " + transfer.to + ", "
                    + (requestId == null ? "no key" : "key " + requestId) + ")");
        }
        long left = requestId == null
                ? apply(transfer)  // không có idempotency key: mỗi lời gọi là một lần chuyển
                : processed.computeIfAbsent(requestId, id -> apply(transfer));  // key đã xử lý: trả kết quả cũ
        if (pause && paused.add(transfer.from)) {
            sleep(1_500);  // mô phỏng server chậm: đã chuyển nhưng chưa trả kết quả
        }
        return left;
    }

    private long apply(Transfer transfer) {
        accounts.merge(transfer.to, transfer.amount, Long::sum);
        long left = accounts.merge(transfer.from, -transfer.amount, Long::sum);  // mỗi tài khoản cập nhật nguyên tử
        transfer.status = "DONE";  // sửa tham số: chỉ sửa bản sao ở server
        if (pause) {
            System.out.println("  applied: " + transfer.from + " balance " + left);
        }
        return left;
    }

    @Override
    public long withdraw(String account, long amount) {
        if (unsafe) {
            long current = unsafeAccounts.get(account);  // đọc rồi ghi: hai thread có thể đọc cùng một số dư
            unsafeAccounts.put(account, current - amount);
            return current - amount;
        }
        return accounts.compute(account, (k, current) -> current - amount);  // đọc và ghi nguyên tử cho từng tài khoản
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
        bank = new BankServer(false, pause);
        unsafeBank = new BankServer(true, false);
        registry = LocateRegistry.createRegistry(1099);
        registry.rebind("Bank", UnicastRemoteObject.exportObject(bank, 9199));
        registry.rebind("UnsafeBank", UnicastRemoteObject.exportObject(unsafeBank, 9199));  // cùng port
        System.out.println("bound Bank, UnsafeBank; object port 9199" + (pause ? "; --pause" : ""));
    }
}
