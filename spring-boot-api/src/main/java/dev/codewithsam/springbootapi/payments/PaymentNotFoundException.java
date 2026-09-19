package dev.codewithsam.springbootapi.payments;

/** A domain error. How it becomes an HTTP response is the controller advice's job. */
public class PaymentNotFoundException extends RuntimeException {
  public PaymentNotFoundException(String id) {
    super("No payment with id " + id);
  }
}
