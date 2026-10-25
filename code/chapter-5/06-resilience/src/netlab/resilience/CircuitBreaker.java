package netlab.resilience;

/**
 * V35: circuit breaker ba trạng thái. CLOSED: cho lời gọi đi qua, đếm lỗi liên tiếp; đủ ngưỡng thì OPEN: từ chối ngay, không
 * gửi request; hết thời gian chờ thì HALF_OPEN: cho một lời gọi thử, thành công thì CLOSED, lỗi thì OPEN lại.
 * Bản tối giản cho một client gọi tuần tự; thư viện thật (Resilience4j) đếm theo cửa sổ và giới hạn số lời gọi thử.
 */
final class CircuitBreaker {

    enum State { CLOSED, OPEN, HALF_OPEN }

    private final int failureThreshold;
    private final long openMillis;
    private State state = State.CLOSED;
    private int failures;
    private long openedAt;

    CircuitBreaker(int failureThreshold, long openMillis) {
        this.failureThreshold = failureThreshold;
        this.openMillis = openMillis;
    }

    synchronized boolean allowRequest(long now) {
        if (state == State.OPEN && now - openedAt >= openMillis) {
            state = State.HALF_OPEN;  // hết thời gian chờ: cho một lời gọi thử
        }
        return state != State.OPEN;  // OPEN: từ chối ngay, không gửi request
    }

    synchronized void onSuccess() {
        failures = 0;
        state = State.CLOSED;
    }

    synchronized void onFailure(long now) {
        failures++;
        if (state == State.HALF_OPEN || failures >= failureThreshold) {  // lời gọi thử lỗi, hoặc đủ ngưỡng lỗi liên tiếp
            state = State.OPEN;
            openedAt = now;
        }
    }

    synchronized State state() {
        return state;
    }
}
