package netlab.nio;

import java.lang.management.ManagementFactory;
import java.util.Map;

/** V33: dữ liệu và phản hồi của giao thức tra cứu (như V14), cùng dòng thống kê in ra khi số kết nối tăng. */
final class Lookup {

    private static final Map<String, String> DATA = Map.of(
            "hanoi", "Thủ đô của Việt Nam",
            "huế", "Cố đô triều Nguyễn");

    private Lookup() {
    }

    static String reply(String key) {
        if (key.isEmpty()) {
            return "ERR empty key";
        }
        String value = DATA.get(key);
        return value != null ? "OK " + value : "NOTFOUND";
    }

    /** Số kết nối đang mở và số platform thread đang sống của cả JVM (virtual thread không được đếm). */
    static void report(String server, int openConnections) {
        System.out.printf("%-8s %5d open connections, %5d live platform threads%n",
                server, openConnections, ManagementFactory.getThreadMXBean().getThreadCount());
    }
}
