package com.mealplaner.purchase;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "purchases")
public class PurchaseDocument {
  @Id
  private String id;

  @Field("user_id")
  private String userId;

  @Field("ingredient_key")
  private String ingredientKey;

  @Field("ingredient_name")
  private String ingredientName;

  private double amount;
  private String unit;
  private double price;

  @Field("purchased_at")
  private Instant purchasedAt;

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

  public String getIngredientName() {
    return ingredientName;
  }

  public void setIngredientName(String ingredientName) {
    this.ingredientName = ingredientName;
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

  public Instant getPurchasedAt() {
    return purchasedAt;
  }

  public void setPurchasedAt(Instant purchasedAt) {
    this.purchasedAt = purchasedAt;
  }
}
