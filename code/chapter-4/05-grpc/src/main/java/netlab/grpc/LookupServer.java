package netlab.grpc;

import io.grpc.Server;
import io.grpc.ServerBuilder;
import io.grpc.stub.StreamObserver;
import java.util.Map;
import netlab.grpc.lookup.LookupGrpc;
import netlab.grpc.lookup.LookupReply;
import netlab.grpc.lookup.LookupRequest;

/**
 * V26: dịch vụ tra cứu qua gRPC. Lớp hiện thực kế thừa LookupGrpc.LookupImplBase do protoc sinh từ lookup.proto; server
 * gRPC (transport Netty, HTTP/2) nhận lời gọi ở port 9199.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.grpc.LookupServer}
 */
public final class LookupServer {

    private static final Map<String, String> DATA = Map.of(
            "hanoi", "Thủ đô của Việt Nam",
            "huế", "Cố đô triều Nguyễn");

    static final class LookupService extends LookupGrpc.LookupImplBase {
        @Override
        public void lookup(LookupRequest request, StreamObserver<LookupReply> responseObserver) {
            String value = DATA.get(request.getKey());
            System.out.println("Lookup(key=\"" + request.getKey() + "\") on " + Thread.currentThread().getName());
            LookupReply reply = LookupReply.newBuilder()
                    .setFound(value != null)
                    .setValue(value != null ? value : "")
                    .build();
            responseObserver.onNext(reply);  // unary: gửi đúng một response
            responseObserver.onCompleted();  // rồi kết thúc lời gọi
        }
    }

    public static void main(String[] args) throws Exception {
        Server server = ServerBuilder.forPort(9199)
                .addService(new LookupService())
                .build()
                .start();
        System.out.println("gRPC server on port 9199");
        server.awaitTermination();
    }
}
