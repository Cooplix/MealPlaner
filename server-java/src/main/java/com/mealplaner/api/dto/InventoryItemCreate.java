package com.mealplaner.api.dto;

import java.time.LocalDateTime;

public class InventoryItemCreate {
  private String ingredientKey;
  private String name;
  private String baseName;
  private String category;
  private String location;
  private double quantity;
  private String unit;
  private Double minQty;
  private Double maxQty;
  private LocalDateTime expiresAt;
  private String notes;

  public String getName() {
    return name;
  }

  public String getIngredientKey() {
    return ingredientKey;
  }

  public void setIngredientKey(String ingredientKey) {
    this.ingredientKey = ingredientKey;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getBaseName() {
    return baseName;
  }

  public void setBaseName(String baseName) {
    this.baseName = baseName;
  }

  public String getCategory() {
    return category;
  }

  public void setCategory(String category) {
    this.category = category;
  }

  public String getLocation() {
    return location;
  }

  public void setLocation(String location) {
    this.location = location;
  }

  public double getQuantity() {
    return quantity;
  }

  public void setQuantity(double quantity) {
    this.quantity = quantity;
  }

  public String getUnit() {
    return unit;
  }

  public void setUnit(String unit) {
    this.unit = unit;
  }

  public Double getMinQty() {
    return minQty;
  }

  public void setMinQty(Double minQty) {
    this.minQty = minQty;
  }

  public Double getMaxQty() {
    return maxQty;
  }

  public void setMaxQty(Double maxQty) {
    this.maxQty = maxQty;
  }

  public LocalDateTime getExpiresAt() {
    return expiresAt;
  }

  public void setExpiresAt(LocalDateTime expiresAt) {
    this.expiresAt = expiresAt;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }
}
