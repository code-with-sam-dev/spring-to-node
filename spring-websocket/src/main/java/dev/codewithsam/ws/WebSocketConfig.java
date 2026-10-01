package dev.codewithsam.ws;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * EPISODE 30. A STOMP endpoint at /ws. By default the in-memory simple broker; with
 * --relay-port, a broker relay to an external STOMP broker, so every instance sees every message.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${relay-port:0}")
    int relayPort;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes("/app");
        if (relayPort > 0) {
            registry.enableStompBrokerRelay("/topic").setRelayPort(relayPort);
        } else {
            registry.enableSimpleBroker("/topic");
        }
    }
}
