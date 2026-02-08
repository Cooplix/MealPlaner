package com.mealplaner.plan;

import java.util.HashMap;
import java.util.Map;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "plans")
public class PlanDocument {
  @Id
  private String id;

  @Field("user_id")
  private String userId;

  @Field("date_iso")
  private String dateIso;

  private Map<String, String> slots = new HashMap<>();

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

  public String getDateIso() {
    return dateIso;
  }

  public void setDateIso(String dateIso) {
    this.dateIso = dateIso;
  }

  public Map<String, String> getSlots() {
    return slots;
  }

  public void setSlots(Map<String, String> slots) {
    this.slots = slots == null ? new HashMap<>() : slots;
  }
}
