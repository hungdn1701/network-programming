package netlab.chat;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.websocket.CloseReason;
import jakarta.websocket.OnClose;
import jakarta.websocket.OnError;
import jakarta.websocket.OnMessage;
import jakarta.websocket.OnOpen;
import jakarta.websocket.Session;
import jakarta.websocket.server.ServerEndpoint;

/**
 * V19: WebSocket endpoint của phòng chat (Jakarta WebSocket). Thư viện gọi onOpen, onMessage, onClose cho từng phiên;
 * endpoint giữ tập phiên đang mở và gửi mỗi tin tới các phiên còn lại. Tên người dùng lấy từ tham số {@code ?name=}.
 */
@ServerEndpoint("/chat")
public class ChatEndpoint {

    private static final Map<String, Session> sessions = new ConcurrentHashMap<>();  // nhiều thread cùng truy cập

    @OnOpen
    public void onOpen(Session session) {
        String name = session.getRequestParameterMap().getOrDefault("name", List.of("guest")).get(0);
        session.getUserProperties().put("name", name);
        sessions.put(session.getId(), session);
        System.out.printf("open  %s (sessions: %d)%n", name, sessions.size());
        broadcast(session, "* " + name + " joined");
    }

    @OnMessage
    public void onMessage(Session session, String text) {
        String name = (String) session.getUserProperties().get("name");
        int sent = broadcast(session, name + ": " + text);
        System.out.printf("%s: %s -> sent to %d%n", name, text, sent);
    }

    @OnClose
    public void onClose(Session session, CloseReason reason) {
        String name = (String) session.getUserProperties().get("name");
        sessions.remove(session.getId());              // phiên đã đóng: không gửi tới nữa
        System.out.printf("close %s, code %d (sessions: %d)%n",
                name, reason.getCloseCode().getCode(), sessions.size());
        broadcast(session, "* " + name + " left");
    }

    @OnError
    public void onError(Session session, Throwable error) {
        System.out.println("error " + session.getUserProperties().get("name") + ": " + error);
    }

    /** Gửi tới mọi phiên khác phiên nguồn; trả về số phiên đã gửi. */
    static int broadcast(Session from, String text) {
        int sent = 0;
        for (Session s : sessions.values()) {
            if (s == from || !s.isOpen()) {
                continue;
            }
            try {
                synchronized (s) {                     // mỗi phiên chỉ một thao tác gửi tại một thời điểm
                    s.getBasicRemote().sendText(text);
                }
                sent++;
            } catch (IOException e) {
                System.out.println("send failed: " + e.getMessage());
            }
        }
        return sent;
    }
}
