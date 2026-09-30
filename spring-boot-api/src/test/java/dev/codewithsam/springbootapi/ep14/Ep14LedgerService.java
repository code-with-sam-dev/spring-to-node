package dev.codewithsam.springbootapi.ep14;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The Spring half of episode 15's transaction scope. post() is @Transactional; postFromInside()
 * calls it through `this`, which bypasses the proxy, so no transaction starts.
 */
@Service
public class Ep14LedgerService {

    private final Ep14LedgerRepository ledger;

    public Ep14LedgerService(Ep14LedgerRepository ledger) {
        this.ledger = ledger;
    }

    @Transactional
    public void post() {
        ledger.save(new Ep14LedgerEntry("debit"));
        ledger.save(new Ep14LedgerEntry("credit"));
        throw new IllegalStateException("boom");
    }

    public void postFromInside() {
        this.post();
    }
}
