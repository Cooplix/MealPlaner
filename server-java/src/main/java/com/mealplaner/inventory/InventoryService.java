package com.mealplaner.inventory;

import com.mealplaner.util.IngredientKey;
import com.mealplaner.util.Units;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class InventoryService {
  private final InventoryItemRepository repository;

  public InventoryService(InventoryItemRepository repository) {
    this.repository = repository;
  }

  public List<InventoryItemDocument> listItems(String userId) {
    List<InventoryItemDocument> items = repository.findByUserId(userId);
    items.sort(Comparator.comparing(InventoryItemDocument::getAddedAt, Comparator.nullsLast(Comparator.reverseOrder())));
    return items;
  }

  public InventoryItemDocument getItem(String userId, String id) {
    return repository.findByIdAndUserId(id, userId).orElseThrow();
  }

  public InventoryItemDocument createItem(String userId, InventoryItemDocument doc) {
    String name = requireValue(doc.getName(), "Name is required");
    String unit = requireValue(doc.getUnit(), "Unit is required");
    doc.setName(name);
    doc.setUnit(unit);
    doc.setBaseName(normalizeOptional(doc.getBaseName()));
    doc.setCategory(normalizeOptional(doc.getCategory()));
    doc.setLocation(normalizeOptional(doc.getLocation()));
    doc.setNotes(normalizeOptional(doc.getNotes()));
    doc.setIngredientKey(normalizeIngredientKey(doc.getIngredientKey(), name, unit));
    validate(doc);
    doc.setUserId(userId);
    if (doc.getAddedAt() == null) {
      doc.setAddedAt(Instant.now());
    }
    if (doc.getChangeSource() == null || doc.getChangeSource().isBlank()) {
      doc.setChangeSource("manual");
    }
    return repository.save(doc);
  }

  public InventoryItemDocument updateItem(
      String userId,
      String id,
      String ingredientKey,
      String name,
      String baseName,
      String category,
      String location,
      Double quantity,
      String unit,
      Double minQty,
      Double maxQty,
      Instant expiresAt,
      String notes
  ) {
    InventoryItemDocument existing = repository.findByIdAndUserId(id, userId).orElseThrow();
    boolean nameChanged = false;
    boolean unitChanged = false;
    if (name != null) {
      existing.setName(requireValue(name, "Name is required"));
      nameChanged = true;
    }
    if (baseName != null) {
      existing.setBaseName(normalizeOptional(baseName));
    }
    if (category != null) {
      existing.setCategory(normalizeOptional(category));
    }
    if (location != null) {
      existing.setLocation(normalizeOptional(location));
    }
    if (unit != null) {
      existing.setUnit(requireValue(unit, "Unit is required"));
      unitChanged = true;
    }
    if (quantity != null) {
      existing.setQuantity(quantity);
    }
    if (minQty != null) {
      existing.setMinQty(minQty);
    }
    if (maxQty != null) {
      existing.setMaxQty(maxQty);
    }
    if (expiresAt != null) {
      existing.setExpiresAt(expiresAt);
    }
    if (notes != null) {
      existing.setNotes(normalizeOptional(notes));
    }
    existing.setChangeSource("manual");
    if (ingredientKey != null) {
      existing.setIngredientKey(normalizeIngredientKey(ingredientKey, existing.getName(), existing.getUnit()));
    }
    if (ingredientKey == null && (nameChanged || unitChanged)) {
      existing.setIngredientKey(normalizeIngredientKey(null, existing.getName(), existing.getUnit()));
    }
    validate(existing);
    return repository.save(existing);
  }

  public void deleteItem(String userId, String id) {
    InventoryItemDocument existing = repository.findByIdAndUserId(id, userId).orElseThrow();
    repository.delete(existing);
  }

  public InventoryItemDocument consume(String userId, String id, double amount) {
    if (amount <= 0) {
      throw new IllegalArgumentException("Amount must be greater than 0");
    }
    InventoryItemDocument existing = repository.findByIdAndUserId(id, userId).orElseThrow();
    double next = existing.getQuantity() - amount;
    if (next < 0) {
      throw new IllegalArgumentException("Cannot consume more than available");
    }
    existing.setQuantity(next);
    existing.setChangeSource("consume");
    return repository.save(existing);
  }

  public InventoryItemDocument addStock(
      String userId,
      String ingredientKey,
      String name,
      double amount,
      String unit,
      String location,
      String source
  ) {
    if (amount <= 0) {
      throw new IllegalArgumentException("Amount must be greater than 0");
    }
    String resolvedUnit = requireValue(unit, "Unit is required");
    String normalizedLocation = normalizeOptional(location);
    String resolvedName = normalizeOptional(name);
    if (resolvedName == null && ingredientKey != null && !ingredientKey.isBlank()) {
      resolvedName = ingredientKey.trim();
    }
    String normalizedKey = normalizeIngredientKey(ingredientKey, resolvedName, resolvedUnit);
    final String resolvedNameValue = resolvedName;
    final String normalizedKeyValue = normalizedKey;
    InventoryItemDocument target = repository
        .findFirstByUserIdAndIngredientKeyAndUnitAndLocation(
            userId,
            normalizedKeyValue,
            resolvedUnit,
            normalizedLocation
        )
        .orElseGet(() -> {
          InventoryItemDocument created = new InventoryItemDocument();
          created.setUserId(userId);
          created.setIngredientKey(normalizedKeyValue);
          created.setName(resolvedNameValue);
          created.setUnit(resolvedUnit);
          created.setLocation(normalizedLocation);
          created.setAddedAt(Instant.now());
          return created;
        });
    if (target.getName() == null && resolvedNameValue != null) {
      target.setName(resolvedNameValue);
    }
    target.setQuantity(target.getQuantity() + amount);
    target.setChangeSource(source == null || source.isBlank() ? "purchase" : source.trim().toLowerCase());
    validate(target);
    return repository.save(target);
  }

  private void validate(InventoryItemDocument doc) {
    if (doc.getQuantity() < 0) {
      throw new IllegalArgumentException("Quantity cannot be negative");
    }
    Double minQty = doc.getMinQty();
    Double maxQty = doc.getMaxQty();
    if (minQty != null && maxQty != null && minQty > maxQty) {
      throw new IllegalArgumentException("Min quantity cannot exceed max quantity");
    }
  }

  private String normalizeOptional(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private String requireValue(String value, String message) {
    String trimmed = value == null ? "" : value.trim();
    if (trimmed.isEmpty()) {
      throw new IllegalArgumentException(message);
    }
    return trimmed;
  }

  private String normalizeIngredientKey(String ingredientKey, String name, String unit) {
    if (ingredientKey != null && !ingredientKey.isBlank()) {
      return ingredientKey.trim().toLowerCase();
    }
    if (name == null || name.trim().isEmpty() || unit == null || unit.trim().isEmpty()) {
      return null;
    }
    String normalizedUnit = Units.sanitize(unit);
    if (!normalizedUnit.equals(unit.trim().toLowerCase())) {
      return null;
    }
    return IngredientKey.normalize(name, unit);
  }
}
