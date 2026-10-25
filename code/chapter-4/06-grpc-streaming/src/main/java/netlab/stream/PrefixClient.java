package netlab.stream;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.StatusRuntimeException;
import java.util.Iterator;
import java.util.concurrent.TimeUnit;
import netlab.stream.lookup.Entry;
import netlab.stream.lookup.LookupGrpc;
import netlab.stream.lookup.LookupRequest;
import netlab.stream.lookup.PrefixRequest;

/**
 * V27: tra cứu theo tiền tố qua server streaming. Blocking stub trả một Iterator: mỗi lần next() nhận một mục ngay khi server
 * gửi. Đối số thứ hai (ms) đặt deadline cho lời gọi; hết deadline, client nhận mã DEADLINE_EXCEEDED.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.stream.PrefixClient hanoi. [1000]}
 */
public final class PrefixClient {

    public static void main(String[] args) throws Exception {
        ManagedChannel channel = ManagedChannelBuilder.forAddress("127.0.0.1", 9199).usePlaintext().build();
        LookupGrpc.LookupBlockingStub stub = LookupGrpc.newBlockingStub(channel);
        stub.lookup(LookupRequest.newBuilder().setKey("hanoi").build());  // thiết lập kết nối HTTP/2 trước khi đo
        if (args.length > 1) {
            stub = stub.withDeadlineAfter(Long.parseLong(args[1]), TimeUnit.MILLISECONDS);  // deadline cho lời gọi
        }
        long start = System.nanoTime();
        try {
            Iterator<Entry> entries = stub.prefix(PrefixRequest.newBuilder().setPrefix(args[0]).build());
            while (entries.hasNext()) {  // nhận dần: mỗi mục đến khi server gửi
                Entry e = entries.next();
                System.out.printf("+%4d ms  %s = %s%n", (System.nanoTime() - start) / 1_000_000, e.getKey(), e.getValue());
            }
            System.out.printf("+%4d ms  completed%n", (System.nanoTime() - start) / 1_000_000);
        } catch (StatusRuntimeException e) {
            System.out.printf("+%4d ms  %s%n", (System.nanoTime() - start) / 1_000_000, e.getStatus().getCode());
        }
        channel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
    }
}
