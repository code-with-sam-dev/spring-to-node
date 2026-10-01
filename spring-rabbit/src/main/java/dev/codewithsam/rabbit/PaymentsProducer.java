package dev.codewithsam.rabbit;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** EPISODE 28: sends one payment with Spring's JSON message converter, to show what goes on the wire. */
@Configuration
@ConditionalOnProperty(name = "role", havingValue = "producer")
class PaymentsProducer {

    record Payment(String id, int amount) {
    }

    @Bean
    ApplicationRunner send(RabbitTemplate rabbit, ConfigurableApplicationContext context) {
        return args -> {
            rabbit.setMessageConverter(new JacksonJsonMessageConverter());
            rabbit.convertAndSend("", "interop", new Payment("pay_spring", 100));
            System.out.println("SENT spring");
            System.exit(SpringApplication.exit(context));
        };
    }
}
