package netlab.resilience;

import java.util.random.RandomGenerator;

/** V35: thời gian chờ trước lần retry thứ attempt (0, 1, 2…): exponential backoff có trần, tùy chọn full jitter. */
final class Backoff {

    private Backoff() {
    }

    static long delayMillis(int attempt, long baseMillis, long capMillis, RandomGenerator jitter) {
        long exp = Math.min(capMillis, baseMillis << attempt);  // 100, 200, 400, 800… không quá cap
        return jitter == null ? exp : (long) (jitter.nextDouble() * exp);  // full jitter: ngẫu nhiên trong [0, exp)
    }
}
