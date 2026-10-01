package dev.codewithsam.graphql;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.graphql.data.method.annotation.BatchMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseBody;

/** EPISODE 32: orders and their customers. Every SQL statement is counted. */
@Controller
public class OrdersController {

    record Order(int id, int total, int customerId) {}
    record Customer(int id, String name) {}

    private final NamedParameterJdbcTemplate jdbc;
    private final AtomicInteger statements = new AtomicInteger();

    OrdersController(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @QueryMapping
    List<Order> orders() {
        statements.incrementAndGet();
        return jdbc.query("SELECT id, total, customer_id FROM ep32_orders ORDER BY id",
            (rs, i) -> new Order(rs.getInt("id"), rs.getInt("total"), rs.getInt("customer_id")));
    }

    @SchemaMapping
    Customer customer(Order order) {
        statements.incrementAndGet();
        return jdbc.queryForObject("SELECT id, name FROM ep32_customers WHERE id = :id", Map.of("id", order.customerId()),
            (rs, i) -> new Customer(rs.getInt("id"), rs.getString("name")));
    }

    @BatchMapping
    Map<Order, Customer> customerBatched(List<Order> orders) {
        statements.incrementAndGet();
        List<Integer> ids = orders.stream().map(Order::customerId).distinct().toList();
        Map<Integer, Customer> byId = jdbc.query("SELECT id, name FROM ep32_customers WHERE id IN (:ids)", new MapSqlParameterSource("ids", ids),
            (rs, i) -> new Customer(rs.getInt("id"), rs.getString("name"))).stream().collect(Collectors.toMap(Customer::id, Function.identity()));
        return orders.stream().collect(Collectors.toMap(Function.identity(), o -> byId.get(o.customerId())));
    }

    @QueryMapping
    String report() {
        statements.incrementAndGet();
        return String.valueOf(jdbc.queryForObject("SELECT count(*) FROM payments_internal", Map.of(), Long.class));
    }

    @GetMapping("/stats")
    @ResponseBody
    Map<String, Integer> stats() {
        return Map.of("statements", statements.get());
    }

    @PostMapping("/stats/reset")
    @ResponseBody
    Map<String, Integer> reset() {
        statements.set(0);
        return Map.of("statements", 0);
    }
}
