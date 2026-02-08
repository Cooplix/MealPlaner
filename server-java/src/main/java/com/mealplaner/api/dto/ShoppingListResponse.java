package com.mealplaner.api.dto;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ShoppingListResponse {
  private Map<String, String> range = new HashMap<>();
  private List<ShoppingListItem> items;

  public ShoppingListResponse() {}

  public ShoppingListResponse(Map<String, String> range, List<ShoppingListItem> items) {
    this.range = range;
    this.items = items;
  }

  public Map<String, String> getRange() {
    return range;
  }

  public void setRange(Map<String, String> range) {
    this.range = range;
  }

  public List<ShoppingListItem> getItems() {
    return items;
  }

  public void setItems(List<ShoppingListItem> items) {
    this.items = items;
  }
}
