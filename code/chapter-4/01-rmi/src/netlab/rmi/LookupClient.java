package netlab.rmi;

import java.lang.reflect.Proxy;
import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;
import java.rmi.server.RemoteObject;

/**
 * V22: client RMI. Tra tên "LookupService" trong RMI registry để nhận stub, rồi gọi lookup trên stub như gọi một đối tượng cục bộ.
 * In lớp của stub (do JDK sinh lúc chạy) và tham chiếu bên trong stub, ghi endpoint của đối tượng ở server.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.rmi.LookupClient hanoi atlantis}
 */
public final class LookupClient {

    public static void main(String[] args) throws Exception {
        Registry registry = LocateRegistry.getRegistry("127.0.0.1", 1099);  // stub của registry, chưa kết nối
        LookupService service = (LookupService) registry.lookup("LookupService");  // tra tên, nhận stub của dịch vụ
        System.out.println("stub class: " + service.getClass().getName());
        RemoteObject handler = (RemoteObject) Proxy.getInvocationHandler(service);  // stub là dynamic proxy
        System.out.println("stub ref: " + handler.getRef().remoteToString());
        for (String key : args) {
            String value = service.lookup(key);  // lời gọi từ xa, cú pháp như lời gọi cục bộ
            System.out.println(key + " -> " + (value != null ? value : "null (không có khóa)"));
        }
    }
}
