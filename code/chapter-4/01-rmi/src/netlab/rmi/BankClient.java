package netlab.rmi;

import java.lang.reflect.Proxy;
import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;
import java.rmi.server.RemoteObject;

/**
 * V22: client RMI. Tra tên "Bank" trong RMI registry để nhận stub, rồi gọi balance trên stub như gọi một đối tượng cục bộ. In lớp
 * của stub (do JDK sinh lúc chạy) và tham chiếu bên trong stub, ghi endpoint của đối tượng ở server.
 *
 * <p>Chạy: {@code java -cp out netlab.rmi.BankClient 1001 9999}
 */
public final class BankClient {

    public static void main(String[] args) throws Exception {
        Registry registry = LocateRegistry.getRegistry("127.0.0.1", 1099);  // stub của registry, chưa kết nối
        Bank bank = (Bank) registry.lookup("Bank");  // tra tên, nhận stub của ngân hàng
        System.out.println("stub class: " + bank.getClass().getName());
        RemoteObject handler = (RemoteObject) Proxy.getInvocationHandler(bank);  // stub là dynamic proxy
        System.out.println("stub ref: " + handler.getRef().remoteToString());
        for (String accountNo : args) {
            try {
                long amount = bank.balance(accountNo);  // lời gọi từ xa, cú pháp như lời gọi cục bộ
                System.out.println("balance(" + accountNo + ") = " + amount);
            } catch (AccountNotFoundException e) {  // lỗi nghiệp vụ do server ném, đi qua mạng nguyên vẹn
                System.out.println("balance(" + accountNo + ") -> " + e.getMessage());
            }
        }
    }
}
