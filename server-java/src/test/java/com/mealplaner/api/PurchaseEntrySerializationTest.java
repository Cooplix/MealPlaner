package com.mealplaner.api;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mealplaner.api.dto.PurchaseEntry;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class PurchaseEntrySerializationTest {
  @Test
  void serializesPurchasedAtWithoutTimezone() throws Exception {
    PurchaseEntry entry = new PurchaseEntry();
    entry.setId("p1");
    entry.setIngredientKey("k1");
    entry.setIngredientName("ing");
    entry.setAmount(1.0);
    entry.setUnit("g");
    entry.setPrice(2.5);
    entry.setPurchasedAt(LocalDateTime.of(2026, 2, 8, 17, 0));

    ObjectMapper mapper = new ObjectMapper()
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    String json = mapper.writeValueAsString(entry);
    assertTrue(json.contains("\"purchasedAt\":\"2026-02-08T17:00:00\""));
    assertFalse(json.contains("Z\""));
  }
}
