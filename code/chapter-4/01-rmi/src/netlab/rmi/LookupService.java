package netlab.rmi;

import java.rmi.Remote;
import java.rmi.RemoteException;

/**
 * V22: remote interface của dịch vụ tra cứu. Client và server cùng dùng interface này: server hiện thực nó, client gọi qua
 * stub có cùng interface. Mọi phương thức khai báo RemoteException vì lời gọi đi qua mạng.
 */
public interface LookupService extends Remote {

    /** Trả giá trị của khóa, hoặc null nếu không có khóa. */
    String lookup(String key) throws RemoteException;
}
