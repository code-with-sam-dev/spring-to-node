package dev.codewithsam.otel;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** EPISODE 37: Spring Boot's OpenTelemetry starter. */
@SpringBootApplication
public class OtelProbeApplication {
    public static void main(String[] args) {
        SpringApplication.run(OtelProbeApplication.class, args);
    }
}
