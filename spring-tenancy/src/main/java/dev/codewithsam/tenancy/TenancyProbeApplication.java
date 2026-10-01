package dev.codewithsam.tenancy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** EPISODE 40: a tenant per request, and a feature flag rollout. */
@SpringBootApplication
public class TenancyProbeApplication {
    public static void main(String[] args) {
        SpringApplication.run(TenancyProbeApplication.class, args);
    }
}
