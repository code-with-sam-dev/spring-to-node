package dev.codewithsam.i18nmail;

import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** EPISODE 39: a receipt in the customer's language, and the email that carries it. */
@RestController
public class PaymentsController {

    private final MessageSource messages;
    private final JavaMailSender mail;
    private final Receipts receipts;

    PaymentsController(MessageSource messages, JavaMailSender mail, Receipts receipts) {
        this.messages = messages;
        this.mail = mail;
        this.receipts = receipts;
    }

    @GetMapping("/receipt")
    String receipt() {
        return messages.getMessage("payment.receipt", null, LocaleContextHolder.getLocale());
    }

    @GetMapping("/refund")
    String refund() {
        return messages.getMessage("payment.refund", null, LocaleContextHolder.getLocale());
    }

    @GetMapping("/mail")
    String send() {
        long started = System.currentTimeMillis();
        try {
            mail.send(receipt("customer@example.test"));
            return "sent after " + (System.currentTimeMillis() - started) + " ms";
        } catch (Exception e) {
            return "failed after " + (System.currentTimeMillis() - started) + " ms: " + e.getClass().getSimpleName();
        }
    }

    @GetMapping("/mail-and-forget")
    String sendAndForget() {
        receipts.send(receipt("customer@example.test"));
        return "payment accepted";
    }

    static SimpleMailMessage receipt(String to) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("payments@example.test");
        message.setTo(to);
        message.setSubject("Receipt");
        message.setText("Paid.");
        return message;
    }

    @Service
    static class Receipts {
        private final JavaMailSender mail;

        Receipts(JavaMailSender mail) {
            this.mail = mail;
        }

        @Async
        void send(SimpleMailMessage message) {
            mail.send(message);
        }
    }
}
