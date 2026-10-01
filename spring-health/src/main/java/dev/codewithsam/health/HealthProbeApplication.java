package dev.codewithsam.health;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** EPISODE 38: a slow payment, a fast one, and Actuator's probes. */
@SpringBootApplication
@RestController
public class HealthProbeApplication {
    public static void main(String[] args) {
        SpringApplication.run(HealthProbeApplication.class, args);
    }

    @GetMapping("/slow")
    String slow() throws InterruptedException {
        Thread.sleep(3000);
        return "charged";
    }

    @GetMapping("/fast")
    String fast() {
        return "ok";
    }
}
