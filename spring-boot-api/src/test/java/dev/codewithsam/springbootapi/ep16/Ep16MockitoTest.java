package dev.codewithsam.springbootapi.ep16;

import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.function.IntConsumer;

import static org.mockito.Mockito.mockingDetails;

/**
 * EPISODE 17, THE SPRING HALF, as reference points for Vitest:
 *   A  a @Mock field used by two tests: what each test sees
 */
@ExtendWith(MockitoExtension.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class Ep16MockitoTest {

    @Mock IntConsumer charge;

    @Test @Order(1)
    void firstTestChargesOnce() {
        charge.accept(100);
        System.out.println("  Spring, A, first test, calls so far: " + mockingDetails(charge).getInvocations().size());
    }

    @Test @Order(2)
    void secondTestChargesOnce() {
        charge.accept(200);
        System.out.println("  Spring, A, second test, calls so far: " + mockingDetails(charge).getInvocations().size());
    }
}
