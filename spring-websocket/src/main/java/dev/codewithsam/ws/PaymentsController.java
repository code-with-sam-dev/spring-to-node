package dev.codewithsam.ws;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

/** EPISODE 30: a payment status broadcast, and a flood for the slow-client probe. */
@Controller
public class PaymentsController {

    private final SimpMessagingTemplate template;

    PaymentsController(SimpMessagingTemplate template) {
        this.template = template;
    }

    @MessageMapping("/pay")
    @SendTo("/topic/payments")
    String pay(String id) {
        return id;
    }

    @MessageMapping("/flood")
    void flood(String count) {
        String chunk = "x".repeat(1024);
        long started = System.currentTimeMillis();
        for (int i = 0; i < Integer.parseInt(count); i++) {
            template.convertAndSend("/topic/flood", chunk);
        }
        System.out.println("FLOOD queued in " + (System.currentTimeMillis() - started) + " ms");
    }

    @EventListener
    void closed(SessionDisconnectEvent event) {
        System.out.println("CLOSED " + event.getCloseStatus());
    }
}
