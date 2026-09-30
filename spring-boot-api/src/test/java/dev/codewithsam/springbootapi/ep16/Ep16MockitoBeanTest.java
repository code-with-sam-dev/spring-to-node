package dev.codewithsam.springbootapi.ep16;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import static org.mockito.Mockito.when;

/**
 * EPISODE 17, C: the container-level swap. @MockitoBean replaces a bean in the test context.
 * At the time of recording @MockBean is not in spring-boot-test 4.1.1.
 */
@SpringJUnitConfig(Ep16MockitoBeanTest.Config.class)
class Ep16MockitoBeanTest {

    interface Greeter {
        String hello();
    }

    @Configuration
    static class Config {
        @Bean
        Greeter greeter() {
            return () -> "real";
        }
    }

    @MockitoBean Greeter greeter;

    @Autowired Greeter injected;

    @Test
    void swapsTheBean() {
        when(greeter.hello()).thenReturn("stubbed");
        System.out.println("  Spring, C, injected greeter with @MockitoBean: " + injected.hello());
    }
}
