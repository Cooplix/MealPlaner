package com.mealplaner.api.dto;

import java.util.ArrayList;
import java.util.List;

public class ShoppingListItem {
  private String name;
  private String unit;
  private double qty;
  private List<String> dishes = new ArrayList<>();

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

  public List<String> getDishes() {
    return dishes;
  }

  public void setDishes(List<String> dishes) {
    this.dishes = dishes == null ? new ArrayList<>() : dishes;
  }
}
