package netlab.stream;

import io.grpc.Server;
import io.grpc.ServerBuilder;
import io.grpc.Status;
import io.grpc.stub.ServerCallStreamObserver;
import io.grpc.stub.StreamObserver;
import java.util.Map;
import java.util.NavigableMap;
import java.util.TreeMap;
import netlab.stream.lookup.Entry;
import netlab.stream.lookup.LookupGrpc;
import netlab.stream.lookup.LookupReply;
import netlab.stream.lookup.LookupRequest;
import netlab.stream.lookup.PrefixRequest;

/**
 * V27: dịch vụ tra cứu gRPC với ba kiểu RPC. Prefix (server streaming) gửi từng mục ngay khi tìm được, mỗi mục mô phỏng tốn
 * 300 ms, và dừng khi client hủy lời gọi hoặc hết deadline. Lookup (unary) báo khóa không tồn tại bằng mã NOT_FOUND.
 * LookupMany (bidirectional streaming) trả lời từng khóa ngay khi nhận.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.stream.LookupServer}
 */
public final class LookupServer {

    private static final NavigableMap<String, String> DATA = new TreeMap<>(Map.of(
            "hanoi", "Thủ đô của Việt Nam",
            "hanoi.hoankiem", "Hồ Hoàn Kiếm",
            "hanoi.longbien", "Cầu Long Biên",
            "hanoi.noibai", "Sân bay Nội Bài",
            "hanoi.tayho", "Hồ Tây",
            "hanoi.vanmieu", "Văn Miếu – Quốc Tử Giám",
            "huế", "Cố đô triều Nguyễn",
            "huế.dainoi", "Đại Nội"));

    static final class LookupService extends LookupGrpc.LookupImplBase {

        @Override
        public void lookup(LookupRequest request, StreamObserver<LookupReply> responseObserver) {
            String value = DATA.get(request.getKey());
            if (value == null) {  // lỗi đi bằng mã trạng thái, không bằng một trường trong reply
                responseObserver.onError(Status.NOT_FOUND.withDescription("key " + request.getKey()).asRuntimeException());
                return;
            }
            responseObserver.onNext(reply(request.getKey(), value));
            responseObserver.onCompleted();
        }

        @Override
        public void prefix(PrefixRequest request, StreamObserver<Entry> responseObserver) {
            ServerCallStreamObserver<Entry> call = (ServerCallStreamObserver<Entry>) responseObserver;
            String prefix = request.getPrefix();
            int sent = 0;
            for (Map.Entry<String, String> e : DATA.tailMap(prefix, true).entrySet()) {
                if (!e.getKey().startsWith(prefix)) {
                    break;
                }
                sleep(300);  // mô phỏng mỗi mục tốn 300 ms để tìm
                if (call.isCancelled()) {  // client đã hủy hoặc hết deadline: dừng, không làm tiếp
                    System.out.println("Prefix(\"" + prefix + "\"): cancelled by client after " + sent + " entries");
                    return;
                }
                call.onNext(Entry.newBuilder().setKey(e.getKey()).setValue(e.getValue()).build());  // gửi ngay mục này
                sent++;
            }
            call.onCompleted();
            System.out.println("Prefix(\"" + prefix + "\"): completed, " + sent + " entries");
        }

        @Override
        public StreamObserver<LookupRequest> lookupMany(StreamObserver<LookupReply> responseObserver) {
            return new StreamObserver<>() {  // nhận từng request của client, trả lời ngay
                @Override
                public void onNext(LookupRequest request) {
                    String value = DATA.get(request.getKey());
                    responseObserver.onNext(reply(request.getKey(), value));
                }

                @Override
                public void onError(Throwable t) {
                    System.out.println("LookupMany: client error " + Status.fromThrowable(t).getCode());
                }

                @Override
                public void onCompleted() {  // client gửi xong: server kết thúc chiều của mình
                    responseObserver.onCompleted();
                }
            };
        }
    }

    private static LookupReply reply(String key, String value) {
        return LookupReply.newBuilder().setKey(key).setFound(value != null).setValue(value != null ? value : "").build();
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    public static void main(String[] args) throws Exception {
        Server server = ServerBuilder.forPort(9199).addService(new LookupService()).build().start();
        System.out.println("gRPC server on port 9199");
        server.awaitTermination();
    }
}
