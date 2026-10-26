package netlab.bank;

import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;

/**
 * V23: hai client cùng rút tiền từ một tài khoản, mỗi client 1 000 lần, mỗi lần 1 000 đồng; tài khoản có 2 000 000 đồng nên phải
 * về 0. Với UnsafeBank (HashMap, đọc rồi ghi), một số lần rút bị mất; với Bank (ConcurrentHashMap.compute), số dư về đúng 0.
 *
 * <p>Chạy (server đang chạy): {@code java -cp out netlab.bank.ConcurrentDemo}
 */
public final class ConcurrentDemo {

    static final int PER_CLIENT = 1_000;

    public static void main(String[] args) throws Exception {
        Registry registry = LocateRegistry.getRegistry("127.0.0.1", 1099);
        for (String name : new String[] {"UnsafeBank", "Bank"}) {
            Bank bank = (Bank) registry.lookup(name);
            long before = bank.balance("1004");
            Thread a = Thread.ofPlatform().start(() -> withdrawMany(bank));
            Thread b = Thread.ofPlatform().start(() -> withdrawMany(bank));
            a.join();
            b.join();
            System.out.println(name + ": " + before + " - " + 2 * PER_CLIENT + " x 1000 -> balance " + bank.balance("1004"));
        }
    }

    private static void withdrawMany(Bank bank) {
        try {
            for (int i = 0; i < PER_CLIENT; i++) {
                bank.withdraw("1004", 1_000);
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
