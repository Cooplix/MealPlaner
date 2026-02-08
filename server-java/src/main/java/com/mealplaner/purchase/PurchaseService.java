package com.mealplaner.purchase;

import com.mealplaner.ingredient.IngredientDocument;
import com.mealplaner.ingredient.IngredientRepository;
import com.mealplaner.inventory.InventoryService;
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
  private final InventoryService inventoryService;

  public PurchaseService(
      PurchaseRepository repository,
      IngredientRepository ingredientRepository,
      InventoryService inventoryService
  ) {
    this.repository = repository;
    this.ingredientRepository = ingredientRepository;
    this.inventoryService = inventoryService;
  }

  public List<PurchaseDocument> list(
      String userId,
      Optional<String> start,
      Optional<String> end,
      Optional<String> ingredientKey
  ) {
    claimUnowned(userId);
    Instant startValue = start.map(value -> parseRange(value, false)).orElse(null);
    Instant endValue = end.map(value -> parseRange(value, true)).orElse(null);

    if (ingredientKey.isPresent()) {
      String key = ingredientKey.get().trim();
      if (startValue != null && endValue != null) {
        return repository.findByUserIdAndIngredientKeyAndPurchasedAtBetweenOrderByPurchasedAtDesc(
            userId,
            key,
            startValue,
            endValue
        );
      }
      if (startValue != null) {
        return repository.findByUserIdAndIngredientKeyAndPurchasedAtGreaterThanEqualOrderByPurchasedAtDesc(
            userId,
            key,
            startValue
        );
      }
      if (endValue != null) {
        return repository.findByUserIdAndIngredientKeyAndPurchasedAtLessThanEqualOrderByPurchasedAtDesc(
            userId,
            key,
            endValue
        );
      }
      return repository.findByUserIdAndIngredientKeyOrderByPurchasedAtDesc(userId, key);
    }

    if (startValue != null && endValue != null) {
      return repository.findByUserIdAndPurchasedAtBetweenOrderByPurchasedAtDesc(userId, startValue, endValue);
    }
    if (startValue != null) {
      return repository.findByUserIdAndPurchasedAtGreaterThanEqualOrderByPurchasedAtDesc(userId, startValue);
    }
    if (endValue != null) {
      return repository.findByUserIdAndPurchasedAtLessThanEqualOrderByPurchasedAtDesc(userId, endValue);
    }
    return repository.findByUserIdOrderByPurchasedAtDesc(userId);
  }

  public PurchaseDocument create(
      String userId,
      String ingredientKey,
      double amount,
      String unit,
      double price,
      LocalDateTime purchasedAt,
      boolean applyToInventory,
      String location
  ) {
    String key = ingredientKey == null ? "" : ingredientKey.trim();
    if (key.isEmpty()) {
      throw new IllegalArgumentException("Ingredient key is required");
    }
    IngredientDocument ingredient = ingredientRepository.findByUserIdAndKey(userId, key)
        .orElseThrow(() -> new IllegalStateException("Ingredient not found"));
    String sanitizedUnit = Units.sanitize(unit);
    PurchaseDocument doc = new PurchaseDocument();
    doc.setUserId(userId);
    doc.setIngredientKey(key);
    doc.setIngredientName(
        ingredient.getName() == null || ingredient.getName().isBlank()
            ? key
            : ingredient.getName()
    );
    doc.setAmount(amount);
    doc.setUnit(sanitizedUnit);
    doc.setPrice(price);
    doc.setPurchasedAt(normalize(purchasedAt));
    PurchaseDocument saved = repository.save(doc);
    if (applyToInventory) {
      inventoryService.addStock(
          userId,
          key,
          ingredient.getName(),
          amount,
          sanitizedUnit,
          location,
          "purchase"
      );
    }
    return saved;
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

  private void claimUnowned(String userId) {
    List<PurchaseDocument> legacy = repository.findByUserIdIsNull();
    if (legacy.isEmpty()) {
      return;
    }
    for (PurchaseDocument doc : legacy) {
      doc.setUserId(userId);
    }
    repository.saveAll(legacy);
  }
}
