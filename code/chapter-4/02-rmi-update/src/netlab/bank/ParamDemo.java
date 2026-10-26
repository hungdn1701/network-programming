package netlab.bank;

import java.rmi.registry.LocateRegistry;

/**
 * V23: tham số Serializable được truyền theo giá trị. Server ghi status DONE trên bản sao của nó, client không thấy; client sửa
 * amount trên bản của mình sau khi gửi, server không thấy.
 *
 * <p>Chạy (server đang chạy): {@code java -cp out netlab.bank.ParamDemo}
 */
public final class ParamDemo {

    public static void main(String[] args) throws Exception {
        Bank bank = (Bank) LocateRegistry.getRegistry("127.0.0.1", 1099).lookup("Bank");
        Transfer transfer = new Transfer("1001", "1002", 1_000_000);
        long left = bank.transfer(transfer, null);  // transfer đi qua serialization: server nhận một bản sao
        System.out.println("server: balance of 1001 = " + left + "; client transfer: " + transfer);
        transfer.amount = 9_999_999;  // chỉ sửa bản của client
        System.out.println("client transfer after edit: " + transfer);
        System.out.println("server: balance of 1001 = " + bank.balance("1001"));
    }
}
