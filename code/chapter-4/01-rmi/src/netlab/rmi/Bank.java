package netlab.rmi;

import java.rmi.Remote;
import java.rmi.RemoteException;

/**
 * V22: remote interface của ngân hàng. Client và server cùng dùng interface này: server hiện thực nó, client gọi qua stub có cùng
 * interface. Mọi phương thức khai báo RemoteException vì lời gọi đi qua mạng; lỗi nghiệp vụ (không có tài khoản) là một ngoại lệ
 * riêng, khác với lỗi mạng.
 */
public interface Bank extends Remote {

    /** Số dư (đồng) của tài khoản. */
    long balance(String accountNo) throws RemoteException, AccountNotFoundException;
}
