package com.mealplaner.inventory;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "pet_inventory_items")
public class PetFoodItemDocument {
  @Id
  private String id;

  @Field("user_id")
  private String userId;

  private String manufacturer;

  @Field("product_name")
  private String productName;

  @Field("food_type")
  private String foodType;

  @Field("package_type")
  private String packageType;

  private Double weight;

  @Field("weight_unit")
  private String weightUnit;

  private double quantity;

  @Field("min_qty")
  private Double minQty;

  @Field("max_qty")
  private Double maxQty;

  @Field("expires_at")
  private Instant expiresAt;

  @Field("added_at")
  private Instant addedAt;

  private String notes;

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

  public String getManufacturer() {
    return manufacturer;
  }

  public void setManufacturer(String manufacturer) {
    this.manufacturer = manufacturer;
  }

  public String getProductName() {
    return productName;
  }

  public void setProductName(String productName) {
    this.productName = productName;
  }

  public String getFoodType() {
    return foodType;
  }

  public void setFoodType(String foodType) {
    this.foodType = foodType;
  }

  public String getPackageType() {
    return packageType;
  }

  public void setPackageType(String packageType) {
    this.packageType = packageType;
  }

  public Double getWeight() {
    return weight;
  }

  public void setWeight(Double weight) {
    this.weight = weight;
  }

  public String getWeightUnit() {
    return weightUnit;
  }

  public void setWeightUnit(String weightUnit) {
    this.weightUnit = weightUnit;
  }

  public double getQuantity() {
    return quantity;
  }

  public void setQuantity(double quantity) {
    this.quantity = quantity;
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
}
