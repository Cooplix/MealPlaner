package com.mealplaner.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;

public class PurchaseCreate {
  @JsonProperty("ingredientKey")
  private String ingredientKey;
  private double amount;
  private String unit;
  private double price;

  @JsonProperty("purchasedAt")
  private LocalDateTime purchasedAt;

  public String getIngredientKey() {
    return ingredientKey;
  }

  public void setIngredientKey(String ingredientKey) {
    this.ingredientKey = ingredientKey;
  }

  public double getAmount() {
    return amount;
  }

  public void setAmount(double amount) {
    this.amount = amount;
  }

  public String getUnit() {
    return unit;
  }

  public void setUnit(String unit) {
    this.unit = unit;
  }

  public double getPrice() {
    return price;
  }

  public void setPrice(double price) {
    this.price = price;
  }

  public LocalDateTime getPurchasedAt() {
    return purchasedAt;
  }

  public void setPurchasedAt(LocalDateTime purchasedAt) {
    this.purchasedAt = purchasedAt;
  }
}
