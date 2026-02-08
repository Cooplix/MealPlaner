package com.mealplaner.api.dto;

import java.time.LocalDateTime;

public class PetFoodItemEntry {
  private String id;
  private String manufacturer;
  private String productName;
  private String foodType;
  private String packageType;
  private Double weight;
  private String weightUnit;
  private double quantity;
  private Double minQty;
  private Double maxQty;
  private LocalDateTime expiresAt;
  private LocalDateTime addedAt;
  private String notes;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
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

  public LocalDateTime getExpiresAt() {
    return expiresAt;
  }

  public void setExpiresAt(LocalDateTime expiresAt) {
    this.expiresAt = expiresAt;
  }

  public LocalDateTime getAddedAt() {
    return addedAt;
  }

  public void setAddedAt(LocalDateTime addedAt) {
    this.addedAt = addedAt;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }
}
