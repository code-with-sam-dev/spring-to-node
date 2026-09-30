package dev.codewithsam.springbootapi.ep16;

import org.junit.jupiter.api.Test;
import org.mockito.MockitoSession;
import org.mockito.quality.Strictness;

import java.util.function.IntSupplier;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockitoSession;
import static org.mockito.Mockito.when;

/**
 * EPISODE 17, B: a stub that is never used, under strict stubs, the default MockitoExtension
 * applies. Run in its own session so the failure can be reported rather than fail the build.
 */
class Ep16StrictStubsTest {

    @Test
    void anUnusedStub() {
        MockitoSession session = mockitoSession().strictness(Strictness.STRICT_STUBS).startMocking();
        IntSupplier balance = mock(IntSupplier.class);
        when(balance.getAsInt()).thenReturn(100);
        try {
            session.finishMocking();
            System.out.println("  Spring, B, unused stub: no error");
        } catch (RuntimeException e) {
            System.out.println("  Spring, B, unused stub: " + e.getClass().getSimpleName());
        }
    }
}
