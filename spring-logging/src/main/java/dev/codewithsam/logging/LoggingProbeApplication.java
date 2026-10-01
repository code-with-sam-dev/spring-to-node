package dev.codewithsam.logging;

import org.slf4j.MDC;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.core.task.TaskDecorator;
import org.springframework.scheduling.annotation.EnableAsync;

/** EPISODE 36: Logback through SLF4J, and the MDC. */
@SpringBootApplication
@EnableAsync
public class LoggingProbeApplication {
    public static void main(String[] args) {
        SpringApplication.run(LoggingProbeApplication.class, args);
    }

    /** Copies the caller's MDC onto the @Async thread. Off by default, to measure without it first. */
    @Bean
    @ConditionalOnProperty("mdc-propagation")
    TaskDecorator mdcTaskDecorator() {
        return task -> {
            var context = MDC.getCopyOfContextMap();
            return () -> {
                if (context != null) MDC.setContextMap(context);
                try {
                    task.run();
                } finally {
                    MDC.clear();
                }
            };
        };
    }
}
