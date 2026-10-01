package dev.codewithsam.sse;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/** EPISODE 31: server sent events with SseEmitter. */
@SpringBootApplication
@EnableScheduling
public class SseProbeApplication {
    public static void main(String[] args) {
        SpringApplication.run(SseProbeApplication.class, args);
    }
}
