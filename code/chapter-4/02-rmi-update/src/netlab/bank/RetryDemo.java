package netlab.bank;

import java.rmi.RemoteException;
import java.rmi.registry.LocateRegistry;
import java.util.UUID;

/**
 * V23: gọi lại sau RemoteException, có và không có idempotency key. Client chờ kết quả tối đa 1 giây; server (chạy với --pause) đã
 * chuyển tiền nhưng dừng 1,5 giây trước khi trả kết quả, nên lần gọi đầu hết thời gian chờ và client gọi lại.
 *
 * <p>Chạy (server chạy với --pause): {@code java -cp out netlab.bank.RetryDemo}
 */
public final class RetryDemo {

    public static void main(String[] args) throws Exception {
        System.setProperty("sun.rmi.transport.tcp.responseTimeout", "1000");  // chờ kết quả tối đa 1 giây
        Bank bank = (Bank) LocateRegistry.getRegistry("127.0.0.1", 1099).lookup("Bank");

        System.out.println("no idempotency key: transfer 1000000 from 1001, balance before " + bank.balance("1001"));
        transferWithRetry(bank, new Transfer("1001", "1002", 1_000_000), null);
        System.out.println("  balance after " + bank.balance("1001"));

        String requestId = UUID.randomUUID().toString().substring(0, 8);  // một key cho một lệnh, dùng lại khi gọi lại
        System.out.println("idempotency key " + requestId + ": transfer 1000000 from 1003, balance before " + bank.balance("1003"));
        transferWithRetry(bank, new Transfer("1003", "1004", 1_000_000), requestId);
        System.out.println("  balance after " + bank.balance("1003"));
    }

    static void transferWithRetry(Bank bank, Transfer transfer, String requestId) throws RemoteException {
        try {
            System.out.println("  attempt 1: balance " + bank.transfer(transfer, requestId));
        } catch (RemoteException e) {  // không biết server đã chuyển tiền hay chưa
            System.out.println("  attempt 1: " + e.getClass().getSimpleName() + ", cause " + e.getCause());
            System.out.println("  attempt 2: balance " + bank.transfer(transfer, requestId));  // gọi lại, cùng requestId
        }
    }
}
