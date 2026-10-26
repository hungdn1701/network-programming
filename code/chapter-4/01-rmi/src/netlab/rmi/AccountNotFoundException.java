package netlab.rmi;

/** V22: lỗi nghiệp vụ — không có tài khoản. RMI chuyển ngoại lệ này về client nguyên vẹn, tách biệt với RemoteException. */
public final class AccountNotFoundException extends Exception {

    public AccountNotFoundException(String accountNo) {
        super("no such account: " + accountNo);
    }
}
