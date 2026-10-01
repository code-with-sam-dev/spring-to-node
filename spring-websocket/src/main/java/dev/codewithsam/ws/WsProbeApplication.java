package dev.codewithsam.ws;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** EPISODE 30: Spring WebSocket with STOMP, one process per instance. */
@SpringBootApplication
public class WsProbeApplication {
    public static void main(String[] args) {
        SpringApplication.run(WsProbeApplication.class, args);
    }
}
