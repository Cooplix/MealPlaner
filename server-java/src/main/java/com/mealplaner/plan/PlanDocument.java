package com.mealplaner.plan;

import java.util.HashMap;
import java.util.Map;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "plans")
public class PlanDocument {
  @Id
  private String id; // dateISO

  private Map<String, String> slots = new HashMap<>();

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public Map<String, String> getSlots() {
    return slots;
  }

  public void setSlots(Map<String, String> slots) {
    this.slots = slots == null ? new HashMap<>() : slots;
  }
}
