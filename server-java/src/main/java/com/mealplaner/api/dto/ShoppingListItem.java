package com.mealplaner.api.dto;

import java.util.ArrayList;
import java.util.List;

public class ShoppingListItem {
  private String ingredientKey;
  private String name;
  private String unit;
  private double qty;
  private double requiredQty;
  private double inStockQty;
  private double toBuyQty;
  private List<String> dishes = new ArrayList<>();

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

  public String getUnit() {
    return unit;
  }

  public void setUnit(String unit) {
    this.unit = unit;
  }

  public double getQty() {
    return qty;
  }

  public void setQty(double qty) {
    this.qty = qty;
  }

  public double getRequiredQty() {
    return requiredQty;
  }

  public void setRequiredQty(double requiredQty) {
    this.requiredQty = requiredQty;
  }

  public double getInStockQty() {
    return inStockQty;
  }

  public void setInStockQty(double inStockQty) {
    this.inStockQty = inStockQty;
  }

  public double getToBuyQty() {
    return toBuyQty;
  }

  public void setToBuyQty(double toBuyQty) {
    this.toBuyQty = toBuyQty;
  }

  public List<String> getDishes() {
    return dishes;
  }

  public void setDishes(List<String> dishes) {
    this.dishes = dishes == null ? new ArrayList<>() : dishes;
  }
}
