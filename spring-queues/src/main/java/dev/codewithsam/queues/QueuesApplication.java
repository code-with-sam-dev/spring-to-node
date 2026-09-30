package dev.codewithsam.queues;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class QueuesApplication {

    public static void main(String[] args) {
        SpringApplication.run(QueuesApplication.class, args);
    }
}
