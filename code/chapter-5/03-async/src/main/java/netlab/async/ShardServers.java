package netlab.async;

import io.grpc.Server;
import io.grpc.ServerBuilder;
import io.grpc.stub.StreamObserver;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import netlab.async.lookup.LookupGrpc;
import netlab.async.lookup.LookupReply;
import netlab.async.lookup.LookupRequest;

/**
 * V32: dữ liệu của dịch vụ tra cứu chia trên ba server gRPC (ba shard), mỗi server trả lời sau một độ trễ mô phỏng: port 9201
 * giữ hanoi (100 ms), 9202 giữ sapa (200 ms), 9203 giữ dalat (300 ms). Ba server chạy chung một tiến trình cho gọn.
 * Đối số --without 9203 bỏ server đó, để mô phỏng một server không chạy.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.async.ShardServers [--without 9203]}
 */
public final class ShardServers {

    record Shard(int port, long delayMillis, String key, String value) {
    }

    static final List<Shard> SHARDS = List.of(
            new Shard(9201, 100, "hanoi", "Thủ đô của Việt Nam"),
            new Shard(9202, 200, "sapa", "Thị trấn vùng cao"),
            new Shard(9203, 300, "dalat", "Thành phố ngàn hoa"));

    public static void main(String[] args) throws Exception {
        String without = args.length > 1 && args[0].equals("--without") ? args[1] : "";
        List<Server> servers = new ArrayList<>();
        for (Shard shard : SHARDS) {
            if (String.valueOf(shard.port()).equals(without)) {
                continue;
            }
            servers.add(ServerBuilder.forPort(shard.port()).addService(service(shard)).build().start());
            System.out.println("shard " + shard.key() + " on port " + shard.port() + ", delay " + shard.delayMillis() + " ms");
        }
        for (Server s : servers) {
            s.awaitTermination();
        }
    }

    private static LookupGrpc.LookupImplBase service(Shard shard) {
        Map<String, String> data = Map.of(shard.key(), shard.value());
        return new LookupGrpc.LookupImplBase() {
            @Override
            public void lookup(LookupRequest request, StreamObserver<LookupReply> responseObserver) {
                try {
                    Thread.sleep(shard.delayMillis());  // mô phỏng thời gian xử lý của server
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                String value = data.get(request.getKey());
                responseObserver.onNext(LookupReply.newBuilder()
                        .setFound(value != null).setValue(value != null ? value : "").build());
                responseObserver.onCompleted();
            }
        };
    }
}
