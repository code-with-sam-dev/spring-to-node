package dev.codewithsam.i18nmail;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

/** EPISODE 39: MessageSource translations and JavaMailSender. */
@SpringBootApplication
@EnableAsync
public class I18nMailProbeApplication {
    public static void main(String[] args) {
        SpringApplication.run(I18nMailProbeApplication.class, args);
    }
}
