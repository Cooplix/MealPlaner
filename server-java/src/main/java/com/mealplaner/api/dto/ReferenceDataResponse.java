package com.mealplaner.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

public class ReferenceDataResponse {
  private List<String> units;

  @JsonProperty("inventoryCategories")
  private List<String> inventoryCategories;

  @JsonProperty("inventoryLocations")
  private List<String> inventoryLocations;

  @JsonProperty("unitConversions")
  private UnitConversions unitConversions;

  public List<String> getUnits() {
    return units;
  }

  public void setUnits(List<String> units) {
    this.units = units;
  }

  public List<String> getInventoryCategories() {
    return inventoryCategories;
  }

  public void setInventoryCategories(List<String> inventoryCategories) {
    this.inventoryCategories = inventoryCategories;
  }

  public List<String> getInventoryLocations() {
    return inventoryLocations;
  }

  public void setInventoryLocations(List<String> inventoryLocations) {
    this.inventoryLocations = inventoryLocations;
  }

  public UnitConversions getUnitConversions() {
    return unitConversions;
  }

  public void setUnitConversions(UnitConversions unitConversions) {
    this.unitConversions = unitConversions;
  }

  public static class UnitConversions {
    private Map<String, Double> mass;
    private Map<String, Double> volume;

    public Map<String, Double> getMass() {
      return mass;
    }

    public void setMass(Map<String, Double> mass) {
      this.mass = mass;
    }

    public Map<String, Double> getVolume() {
      return volume;
    }

    public void setVolume(Map<String, Double> volume) {
      this.volume = volume;
    }
  }
}
