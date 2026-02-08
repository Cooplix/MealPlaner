package com.mealplaner.inventory;

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
    doc.setName(requireValue(doc.getName(), "Name is required"));
    doc.setUnit(requireValue(doc.getUnit(), "Unit is required"));
    doc.setBaseName(normalizeOptional(doc.getBaseName()));
    doc.setCategory(normalizeOptional(doc.getCategory()));
    doc.setLocation(normalizeOptional(doc.getLocation()));
    doc.setNotes(normalizeOptional(doc.getNotes()));
    validate(doc);
    doc.setUserId(userId);
    if (doc.getAddedAt() == null) {
      doc.setAddedAt(Instant.now());
    }
    return repository.save(doc);
  }

  public InventoryItemDocument updateItem(
      String userId,
      String id,
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
    if (name != null) {
      existing.setName(requireValue(name, "Name is required"));
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
    return repository.save(existing);
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
}
