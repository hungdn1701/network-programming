package netlab.grpc;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import java.util.concurrent.TimeUnit;
import netlab.grpc.lookup.LookupGrpc;
import netlab.grpc.lookup.LookupReply;
import netlab.grpc.lookup.LookupRequest;

/**
 * V26: client gRPC. ManagedChannel quản lý kết nối HTTP/2 tới server; blocking stub do protoc sinh gọi Lookup như một
 * phương thức cục bộ và chặn thread gọi đến khi có kết quả.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.grpc.LookupClient hanoi atlantis}
 */
public final class LookupClient {

    public static void main(String[] args) throws Exception {
        ManagedChannel channel = ManagedChannelBuilder.forAddress("127.0.0.1", 9199)
                .usePlaintext()  // HTTP/2 không mã hóa (h2c), chỉ để chạy cục bộ
                .build();
        LookupGrpc.LookupBlockingStub stub = LookupGrpc.newBlockingStub(channel);
        for (String key : args) {
            LookupRequest request = LookupRequest.newBuilder().setKey(key).build();
            LookupReply reply = stub.lookup(request);  // lời gọi unary qua blocking stub
            System.out.println(key + " -> found=" + reply.getFound() + ", value=\"" + reply.getValue() + "\"");
        }
        channel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
    }
}
