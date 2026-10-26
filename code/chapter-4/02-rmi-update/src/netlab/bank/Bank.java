package netlab.bank;

import java.rmi.Remote;
import java.rmi.RemoteException;

/** V23: remote interface của ngân hàng, thêm chuyển tiền và rút tiền. */
public interface Bank extends Remote {

    /** Số dư (đồng) của tài khoản. */
    long balance(String account) throws RemoteException;

    /**
     * Chuyển tiền; trả số dư mới của tài khoản nguồn. requestId là idempotency key: các lời gọi cùng requestId chỉ được thực hiện
     * một lần. requestId null thì mỗi lời gọi là một lần chuyển.
     */
    long transfer(Transfer transfer, String requestId) throws RemoteException;

    /** Rút tiền; trả số dư mới. */
    long withdraw(String account, long amount) throws RemoteException;
}
