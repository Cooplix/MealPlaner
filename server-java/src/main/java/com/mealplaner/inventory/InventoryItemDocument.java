package com.mealplaner.inventory;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "inventory_items")
public class InventoryItemDocument {
  @Id
  private String id;

  @Field("user_id")
  private String userId;

  @Field("ingredient_key")
  private String ingredientKey;

  private String name;

  @Field("base_name")
  private String baseName;

  private String category;
  private String location;
  private double quantity;
  private String unit;

  @Field("min_qty")
  private Double minQty;

  @Field("max_qty")
  private Double maxQty;

  @Field("expires_at")
  private Instant expiresAt;

  @Field("added_at")
  private Instant addedAt;

  private String notes;

  @Field("change_source")
  private String changeSource;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getUserId() {
    return userId;
  }

  public void setUserId(String userId) {
    this.userId = userId;
  }

  public String getIngredientKey() {
    return ingredientKey;
  }

  public void setIngredientKey(String ingredientKey) {
    this.ingredientKey = ingredientKey;
  }

  public String getName() {
    return name;
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

  public Instant getExpiresAt() {
    return expiresAt;
  }

  public void setExpiresAt(Instant expiresAt) {
    this.expiresAt = expiresAt;
  }

  public Instant getAddedAt() {
    return addedAt;
  }

  public void setAddedAt(Instant addedAt) {
    this.addedAt = addedAt;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }

  public String getChangeSource() {
    return changeSource;
  }

  public void setChangeSource(String changeSource) {
    this.changeSource = changeSource;
  }
}
