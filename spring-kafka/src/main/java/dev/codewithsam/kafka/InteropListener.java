package dev.codewithsam.kafka;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.listener.CommonErrorHandler;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.stereotype.Component;
import org.springframework.util.backoff.FixedBackOff;

/**
 * EPISODE 27: reads the interop topic with Spring's typed JSON deserializer, the way a Spring
 * service reads its own topics, and prints what it got or why it could not.
 */
@Component
@ConditionalOnProperty(name = "role", havingValue = "interop")
class InteropListener {

    @KafkaListener(topics = "interop", groupId = "${group}")
    void read(ConsumerRecord<String, Object> record) {
        System.out.println("HANDLED spring interop key " + record.key() + " value " + record.value());
    }

    @Bean
    CommonErrorHandler printFailures() {
        DefaultErrorHandler handler = new DefaultErrorHandler((record, e) ->
            System.out.println("FAILED spring interop key " + record.key() + ": " + rootMessage(e)), new FixedBackOff(0, 0));
        return handler;
    }

    static String rootMessage(Throwable e) {
        Throwable t = e;
        while (t.getCause() != null) t = t.getCause();
        return t.getMessage();
    }
}
