package netlab.update;

import java.rmi.registry.LocateRegistry;

/**
 * V23: tham số Serializable được truyền theo giá trị. Server sửa version trên bản sao của nó, client không thấy; client sửa
 * value trên bản của mình sau khi gửi, server không thấy.
 *
 * <p>Chạy (server đang chạy): {@code java -Dstdout.encoding=UTF-8 -cp out netlab.update.ParamDemo}
 */
public final class ParamDemo {

    public static void main(String[] args) throws Exception {
        EntryService service = (EntryService) LocateRegistry.getRegistry("127.0.0.1", 1099).lookup("EntryService");
        Entry entry = new Entry("sapa", "Thị trấn vùng cao");
        long version = service.update(entry, null);  // entry đi qua serialization: server nhận một bản sao
        System.out.println("server returned version " + version + "; client entry.version = " + entry.version);
        entry.value = "sửa ở client";  // chỉ sửa bản của client
        System.out.println("client entry: " + entry);
        System.out.println("server entry: " + service.lookup("sapa"));
    }
}
