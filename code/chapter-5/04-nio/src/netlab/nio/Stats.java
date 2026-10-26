package netlab.nio;

import java.lang.management.ManagementFactory;

/** V33: dòng thống kê in ra khi số kết nối tăng, dùng chung cho các echo server của phần. */
final class Stats {

    private Stats() {
    }

    /** Số kết nối đang mở và số platform thread đang sống của cả JVM (virtual thread không được đếm). */
    static void report(String server, int openConnections) {
        System.out.printf("%-8s %5d open connections, %5d live platform threads%n",
                server, openConnections, ManagementFactory.getThreadMXBean().getThreadCount());
    }
}
