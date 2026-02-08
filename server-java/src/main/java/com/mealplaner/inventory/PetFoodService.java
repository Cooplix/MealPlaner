package com.mealplaner.inventory;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class PetFoodService {
  private final PetFoodItemRepository repository;

  public PetFoodService(PetFoodItemRepository repository) {
    this.repository = repository;
  }

  public List<PetFoodItemDocument> listItems(String userId) {
    List<PetFoodItemDocument> items = repository.findByUserId(userId);
    items.sort(Comparator.comparing(PetFoodItemDocument::getAddedAt, Comparator.nullsLast(Comparator.reverseOrder())));
    return items;
  }

  public PetFoodItemDocument getItem(String userId, String id) {
    return repository.findByIdAndUserId(id, userId).orElseThrow();
  }

  public PetFoodItemDocument createItem(String userId, PetFoodItemDocument doc) {
    doc.setManufacturer(requireValue(doc.getManufacturer(), "Manufacturer is required"));
    doc.setProductName(requireValue(doc.getProductName(), "Product name is required"));
    doc.setFoodType(normalizeOptional(doc.getFoodType()));
    doc.setPackageType(normalizeOptional(doc.getPackageType()));
    doc.setWeightUnit(normalizeOptional(doc.getWeightUnit()));
    doc.setNotes(normalizeOptional(doc.getNotes()));
    validate(doc);
    doc.setUserId(userId);
    if (doc.getAddedAt() == null) {
      doc.setAddedAt(Instant.now());
    }
    return repository.save(doc);
  }

  public PetFoodItemDocument updateItem(
      String userId,
      String id,
      String manufacturer,
      String productName,
      String foodType,
      String packageType,
      Double weight,
      String weightUnit,
      Double quantity,
      Double minQty,
      Double maxQty,
      Instant expiresAt,
      String notes
  ) {
    PetFoodItemDocument existing = repository.findByIdAndUserId(id, userId).orElseThrow();
    if (manufacturer != null) {
      existing.setManufacturer(requireValue(manufacturer, "Manufacturer is required"));
    }
    if (productName != null) {
      existing.setProductName(requireValue(productName, "Product name is required"));
    }
    if (foodType != null) {
      existing.setFoodType(normalizeOptional(foodType));
    }
    if (packageType != null) {
      existing.setPackageType(normalizeOptional(packageType));
    }
    if (weight != null) {
      existing.setWeight(weight);
    }
    if (weightUnit != null) {
      existing.setWeightUnit(normalizeOptional(weightUnit));
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
    validate(existing);
    return repository.save(existing);
  }

  public void deleteItem(String userId, String id) {
    PetFoodItemDocument existing = repository.findByIdAndUserId(id, userId).orElseThrow();
    repository.delete(existing);
  }

  public PetFoodItemDocument consume(String userId, String id, double amount) {
    if (amount <= 0) {
      throw new IllegalArgumentException("Amount must be greater than 0");
    }
    PetFoodItemDocument existing = repository.findByIdAndUserId(id, userId).orElseThrow();
    double next = existing.getQuantity() - amount;
    if (next < 0) {
      throw new IllegalArgumentException("Cannot consume more than available");
    }
    existing.setQuantity(next);
    return repository.save(existing);
  }

  private void validate(PetFoodItemDocument doc) {
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
}
