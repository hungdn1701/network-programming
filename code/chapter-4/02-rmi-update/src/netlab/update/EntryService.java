package netlab.update;

import java.rmi.Remote;
import java.rmi.RemoteException;

/** V23: remote interface của dịch vụ tra cứu có thao tác cập nhật. */
public interface EntryService extends Remote {

    /** Trả mục của khóa, hoặc null nếu không có khóa. */
    Entry lookup(String key) throws RemoteException;

    /**
     * Ghi giá trị mới cho khóa và tăng version; trả version sau khi cập nhật. requestId là idempotency key: các lời gọi cùng
     * requestId chỉ được áp dụng một lần. requestId null thì mỗi lời gọi là một lần cập nhật.
     */
    long update(Entry entry, String requestId) throws RemoteException;
}
