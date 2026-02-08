package com.mealplaner.api.dto;

import java.util.HashMap;
import java.util.Map;

public class DayPlan {
  private String dateISO;
  private Map<String, String> slots = new HashMap<>();

  public String getDateISO() {
    return dateISO;
  }

  public void setDateISO(String dateISO) {
    this.dateISO = dateISO;
  }

  public Map<String, String> getSlots() {
    return slots;
  }

  public void setSlots(Map<String, String> slots) {
    this.slots = slots == null ? new HashMap<>() : slots;
  }
}
