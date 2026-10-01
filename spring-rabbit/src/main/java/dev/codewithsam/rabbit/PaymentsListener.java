package dev.codewithsam.rabbit;

import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * EPISODE 28: a Spring AMQP consumer with Spring Boot's listener defaults. Prints one line per
 * message it handles. A body containing "poison" always throws.
 */
@Component
@ConditionalOnProperty(name = "role", havingValue = "consumer")
class PaymentsListener {

    @RabbitListener(queues = "${queue}")
    void handle(Message message) {
        String body = new String(message.getBody());
        System.out.println("HANDLED spring " + body + " redelivered " + message.getMessageProperties().isRedelivered()
            + " headers " + message.getMessageProperties().getHeaders().keySet());
        if (body.contains("poison")) throw new IllegalStateException("cannot settle this payment");
    }
}
