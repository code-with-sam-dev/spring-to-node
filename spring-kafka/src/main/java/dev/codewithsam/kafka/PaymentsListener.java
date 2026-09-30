package dev.codewithsam.kafka;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * EPISODE 27: a Spring Kafka consumer. Prints one line per message it handles, so the probe can
 * count across processes. A message containing "poison" always throws.
 */
@Component
@ConditionalOnProperty(name = "role", havingValue = "consumer")
class PaymentsListener {

    @KafkaListener(topics = "payments", groupId = "${group}")
    void handle(ConsumerRecord<String, String> record) {
        StringBuilder headers = new StringBuilder();
        record.headers().forEach(h -> headers.append(headers.isEmpty() ? "" : ",").append(h.key()));
        System.out.println("HANDLED spring " + record.value() + " partition " + record.partition() + " headers " + (headers.isEmpty() ? "none" : headers));
        if (record.value().contains("poison")) throw new IllegalStateException("cannot settle this payment");
    }
}
