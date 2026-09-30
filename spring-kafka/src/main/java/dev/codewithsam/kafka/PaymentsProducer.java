package dev.codewithsam.kafka;

import java.util.Map;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.KafkaTemplate;

/** EPISODE 27: sends one payment object with Spring's JSON serializer, to show what goes on the wire. */
@Configuration
@ConditionalOnProperty(name = "role", havingValue = "producer")
class PaymentsProducer {

    record Payment(String id, int amount) {
    }

    @Bean
    ApplicationRunner send(KafkaTemplate<String, Object> kafka) {
        return args -> {
            kafka.send("interop", "pay_spring", new Payment("pay_spring", 100)).get();
            System.out.println("SENT spring");
        };
    }
}
