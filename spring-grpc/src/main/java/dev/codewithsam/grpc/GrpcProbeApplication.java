package dev.codewithsam.grpc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** EPISODE 33: a Spring gRPC server. */
@SpringBootApplication
public class GrpcProbeApplication {
    public static void main(String[] args) {
        SpringApplication.run(GrpcProbeApplication.class, args);
    }
}
