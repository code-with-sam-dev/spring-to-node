package dev.codewithsam.springbootapi.ep05;

import jakarta.validation.constraints.NotNull;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.SystemEnvironmentPropertySource;
import org.springframework.validation.annotation.Validated;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The structured half of Spring configuration, and the nuance that stops the
 * episode overclaiming.
 *
 * 1. RELAXED BINDING. An environment variable written PAYMENT_GATEWAY_URL binds
 *    to payment.gateway.url. NestJS has no equivalent: process.env keys are
 *    exactly the strings you typed.
 * 2. @ConfigurationProperties DOES NOT FAIL FAST BY ITSELF. With the value
 *    missing it binds null and the context starts, the same shape as NestJS.
 *    Only @Validated with a constraint buys the startup failure. So the episode
 *    says "this required @Value fails fast", never "Spring fails fast".
 */
class GatewayPropertiesTest {

    @ConfigurationProperties("payment.gateway")
    record GatewayProperties(String url) {}

    @Validated
    @ConfigurationProperties("payment.gateway")
    record ValidatedGatewayProperties(@NotNull String url) {}

    @Configuration
    @EnableConfigurationProperties(GatewayProperties.class)
    static class Plain {}

    @Configuration
    @EnableConfigurationProperties(ValidatedGatewayProperties.class)
    static class Validated_ {}

    private static ApplicationContextRunner withEnv(Class<?> config, Map<String, Object> env) {
        return new ApplicationContextRunner()
                .withUserConfiguration(config)
                .withInitializer(ctx -> ctx.getEnvironment().getPropertySources()
                        .addFirst(new SystemEnvironmentPropertySource("env", env)));
    }

    @Test
    void an_environment_variable_binds_by_relaxed_binding() {
        withEnv(Plain.class, Map.of("PAYMENT_GATEWAY_URL", "https://api.example.test/v2")).run(ctx -> {
            String url = ctx.getBean(GatewayProperties.class).url();
            System.out.println("PAYMENT_GATEWAY_URL binds to payment.gateway.url   " + url);
            assertThat(url).isEqualTo("https://api.example.test/v2");
        });
    }

    @Test
    void unvalidated_properties_bind_null_and_start() {
        withEnv(Plain.class, Map.of()).run(ctx -> {
            assertThat(ctx).hasNotFailed();
            String url = ctx.getBean(GatewayProperties.class).url();
            System.out.println("@ConfigurationProperties, value missing       started, url = " + url);
            assertThat(url).isNull();
        });
    }

    @Test
    void validated_properties_refuse_to_start() {
        withEnv(Validated_.class, Map.of()).run(ctx -> {
            assertThat(ctx).hasFailed();
            Throwable root = ctx.getStartupFailure();
            while (root.getCause() != null) root = root.getCause();
            String msg = String.valueOf(ctx.getStartupFailure().getMessage()) + " " + root.getMessage();
            System.out.println("@Validated + @NotNull, value missing          refused to start");
            System.out.println("  " + root.getMessage().lines().filter(l -> l.contains("payment.gateway") || l.contains("null") || l.contains("Reason")).limit(4).reduce("", (a, b) -> a + b.trim() + " | "));
            assertThat(msg).contains("payment.gateway").contains("must not be null");
        });
    }
}
