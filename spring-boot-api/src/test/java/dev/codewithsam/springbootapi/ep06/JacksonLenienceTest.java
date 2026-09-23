package dev.codewithsam.springbootapi.ep06;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * WHY Spring accepted the string and the unknown field, measured rather than
 * asserted, and what turns each one off.
 *
 * The live comparison showed Spring answering 201 to an amount sent as the
 * string "10000" and 201 to a payload carrying an extra isAdmin field, while
 * the NestJS service refused both. That is the JSON library's defaults, not a
 * Spring decision, and the episode should name the knob rather than leave a
 * viewer thinking Spring is careless.
 *
 * AT THE TIME OF RECORDING, September 2026, SPRING BOOT 4.1.1 SHIPS JACKSON 3,
 * and the package moved: `tools.jackson.databind`, not
 * `com.fasterxml.jackson.databind`. The annotations are still on the old
 * coordinates at 2.21. Anything a viewer reads about Jackson written before
 * this will use the old import and will not compile. That is worth ten seconds
 * on screen, with the date attached.
 *
 * A plain mapper rather than an HTTP round trip on purpose: the behaviour
 * belongs to the deserialiser, so the claim should be about the library rather
 * than about our controller.
 */
class JacksonLenienceTest {

    record Payment(long amountInMinorUnits, String currency, String idempotencyKey) {}

    private static final String STRING_AMOUNT =
            "{\"amountInMinorUnits\":\"10000\",\"currency\":\"USD\",\"idempotencyKey\":\"k\"}";
    private static final String EXTRA_FIELD =
            "{\"amountInMinorUnits\":1,\"currency\":\"USD\",\"idempotencyKey\":\"k\",\"isAdmin\":true}";

    @Test
    void by_default_a_string_is_coerced_into_a_number() {
        ObjectMapper mapper = new ObjectMapper();
        Payment p = mapper.readValue(STRING_AMOUNT, Payment.class);
        System.out.println("default mapper turned \"10000\" into: " + p.amountInMinorUnits());
        assertThat(p.amountInMinorUnits()).isEqualTo(10_000L);
    }

    @Test
    void by_default_an_unknown_field_is_ignored_not_bound() {
        ObjectMapper mapper = new ObjectMapper();
        Payment p = mapper.readValue(EXTRA_FIELD, Payment.class);
        System.out.println("default mapper accepted it, and isAdmin is nowhere: " + p);
        assertThat(p.currency()).isEqualTo("USD");
    }

    @Test
    void fail_on_unknown_properties_turns_that_into_a_rejection() {
        ObjectMapper strict = JsonMapper.builder()
                .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .build();

        assertThatThrownBy(() -> strict.readValue(EXTRA_FIELD, Payment.class))
                .satisfies(e -> System.out.println(
                        "with FAIL_ON_UNKNOWN_PROPERTIES: " + e.getMessage().split("\n")[0]))
                .hasMessageContaining("isAdmin");
    }
}
