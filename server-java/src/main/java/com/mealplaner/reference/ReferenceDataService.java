package com.mealplaner.reference;

import com.mealplaner.api.dto.ReferenceDataResponse;
import com.mealplaner.util.Units;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ReferenceDataService {
  private static final List<String> INVENTORY_CATEGORIES = List.of(
      "Крупи/хліб/борошно",
      "Соуси/спеції/консервація",
      "Овочі/фрукти",
      "Молочне",
      "Солодке",
      "Білок",
      "Жири/олії",
      "Заморожене",
      "Інше"
  );

  private static final List<String> INVENTORY_LOCATIONS = List.of(
      "Комора",
      "Холодильник",
      "Морозилка"
  );

  private static final Map<String, Double> MASS_CONVERSIONS = new LinkedHashMap<>();
  private static final Map<String, Double> VOLUME_CONVERSIONS = new LinkedHashMap<>();

  static {
    MASS_CONVERSIONS.put("kg", 1.0);
    MASS_CONVERSIONS.put("g", 1.0 / 1000);
    MASS_CONVERSIONS.put("mg", 1.0 / 1_000_000);
    MASS_CONVERSIONS.put("lb", 0.453592);
    MASS_CONVERSIONS.put("oz", 0.0283495);

    VOLUME_CONVERSIONS.put("l", 1.0);
    VOLUME_CONVERSIONS.put("ml", 1.0 / 1000);
    VOLUME_CONVERSIONS.put("cup", 0.236588);
    VOLUME_CONVERSIONS.put("tbsp", 0.0147868);
    VOLUME_CONVERSIONS.put("tsp", 0.00492892);
  }

  public ReferenceDataResponse getReferenceData() {
    ReferenceDataResponse response = new ReferenceDataResponse();
    response.setUnits(Units.MEASUREMENT_UNITS);
    response.setInventoryCategories(INVENTORY_CATEGORIES);
    response.setInventoryLocations(INVENTORY_LOCATIONS);

    ReferenceDataResponse.UnitConversions conversions = new ReferenceDataResponse.UnitConversions();
    conversions.setMass(MASS_CONVERSIONS);
    conversions.setVolume(VOLUME_CONVERSIONS);
    response.setUnitConversions(conversions);
    return response;
  }
}
