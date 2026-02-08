package com.mealplaner.purchase;

import com.mealplaner.ingredient.IngredientDocument;
import com.mealplaner.ingredient.IngredientRepository;
import com.mealplaner.util.Units;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class PurchaseService {
  private final PurchaseRepository repository;
  private final IngredientRepository ingredientRepository;

  public PurchaseService(PurchaseRepository repository, IngredientRepository ingredientRepository) {
    this.repository = repository;
    this.ingredientRepository = ingredientRepository;
  }

  public List<PurchaseDocument> list(Optional<String> start, Optional<String> end, Optional<String> ingredientKey) {
    Instant startValue = start.map(value -> parseRange(value, false)).orElse(null);
    Instant endValue = end.map(value -> parseRange(value, true)).orElse(null);

    if (ingredientKey.isPresent()) {
      String key = ingredientKey.get().trim();
      if (startValue != null && endValue != null) {
        return repository.findByIngredientKeyAndPurchasedAtBetweenOrderByPurchasedAtDesc(key, startValue, endValue);
      }
      if (startValue != null) {
        return repository.findByIngredientKeyAndPurchasedAtGreaterThanEqualOrderByPurchasedAtDesc(key, startValue);
      }
      if (endValue != null) {
        return repository.findByIngredientKeyAndPurchasedAtLessThanEqualOrderByPurchasedAtDesc(key, endValue);
      }
      return repository.findByIngredientKeyOrderByPurchasedAtDesc(key);
    }

    if (startValue != null && endValue != null) {
      return repository.findByPurchasedAtBetweenOrderByPurchasedAtDesc(startValue, endValue);
    }
    if (startValue != null) {
      return repository.findByPurchasedAtGreaterThanEqualOrderByPurchasedAtDesc(startValue);
    }
    if (endValue != null) {
      return repository.findByPurchasedAtLessThanEqualOrderByPurchasedAtDesc(endValue);
    }
    return repository.findAll().stream()
        .sorted((a, b) -> b.getPurchasedAt().compareTo(a.getPurchasedAt()))
        .toList();
  }

  public PurchaseDocument create(
      String ingredientKey,
      double amount,
      String unit,
      double price,
      LocalDateTime purchasedAt
  ) {
    String key = ingredientKey == null ? "" : ingredientKey.trim();
    if (key.isEmpty()) {
      throw new IllegalArgumentException("Ingredient key is required");
    }
    IngredientDocument ingredient = ingredientRepository.findByKey(key)
        .orElseThrow(() -> new IllegalStateException("Ingredient not found"));
    PurchaseDocument doc = new PurchaseDocument();
    doc.setIngredientKey(key);
    doc.setIngredientName(
        ingredient.getName() == null || ingredient.getName().isBlank()
            ? key
            : ingredient.getName()
    );
    doc.setAmount(amount);
    doc.setUnit(Units.sanitize(unit));
    doc.setPrice(price);
    doc.setPurchasedAt(normalize(purchasedAt));
    return repository.save(doc);
  }

  private Instant normalize(LocalDateTime value) {
    if (value == null) {
      return Instant.now();
    }
    return value.toInstant(ZoneOffset.UTC);
  }

  private Instant parseRange(String raw, boolean endOfDay) {
    try {
      return OffsetDateTime.parse(raw).toInstant();
    } catch (DateTimeParseException ignored) {
      try {
        LocalDate date = LocalDate.parse(raw);
        if (endOfDay) {
          return date.atTime(23, 59, 59, 999000000).toInstant(ZoneOffset.UTC);
        }
        return date.atStartOfDay().toInstant(ZoneOffset.UTC);
      } catch (DateTimeParseException ex) {
        throw new IllegalArgumentException("Invalid date range value");
      }
    }
  }
}
