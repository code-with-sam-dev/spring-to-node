package dev.codewithsam.grpc;

import dev.codewithsam.grpc.proto.ChargeReply;
import dev.codewithsam.grpc.proto.ChargeRequest;
import dev.codewithsam.grpc.proto.PaymentsGrpc;
import dev.codewithsam.grpc.proto.StatsReply;
import io.grpc.Context;
import io.grpc.stub.StreamObserver;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Service;

/** EPISODE 33: what the server saw, a slow call, and a failure. */
@Service
public class PaymentsService extends PaymentsGrpc.PaymentsImplBase {

    private final AtomicInteger completed = new AtomicInteger();
    private final AtomicInteger skipped = new AtomicInteger();

    @Override
    public void charge(ChargeRequest request, StreamObserver<ChargeReply> reply) {
        long amount = request.getAmountCents();
        String seen = "type of amount_cents long, amount_cents plus 1 " + (amount + 1) + ", amount_cents == 0 " + (amount == 0)
            + ", capture " + request.getCapture();
        reply.onNext(ChargeReply.newBuilder().setSeen(seen).build());
        reply.onCompleted();
    }

    @Override
    public void slow(ChargeRequest request, StreamObserver<ChargeReply> reply) {
        sleep();
        completed.incrementAndGet();
        reply.onNext(ChargeReply.newBuilder().setSeen("charged").build());
        reply.onCompleted();
    }

    @Override
    public void slowChecked(ChargeRequest request, StreamObserver<ChargeReply> reply) {
        sleep();
        if (Context.current().isCancelled()) {
            skipped.incrementAndGet();
            return;
        }
        completed.incrementAndGet();
        reply.onNext(ChargeReply.newBuilder().setSeen("charged").build());
        reply.onCompleted();
    }

    @Override
    public void fail(ChargeRequest request, StreamObserver<ChargeReply> reply) {
        throw new IllegalStateException("ledger offline at ledger-db:5432");
    }

    @Override
    public void stats(ChargeRequest request, StreamObserver<StatsReply> reply) {
        reply.onNext(StatsReply.newBuilder().setCompleted(completed.get()).setSkipped(skipped.get()).build());
        reply.onCompleted();
    }

    private static void sleep() {
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
