package com.mealplaner.api;

import com.mealplaner.api.dto.DayPlan;
import com.mealplaner.plan.PlanDocument;
import com.mealplaner.plan.PlanService;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/plans")
public class PlansController {
  private final PlanService planService;

  public PlansController(PlanService planService) {
    this.planService = planService;
  }

  @GetMapping
  public List<DayPlan> list(
      @RequestParam(required = false) String start,
      @RequestParam(required = false) String end
  ) {
    validateDate(start);
    validateDate(end);
    return planService.listPlans(Optional.ofNullable(start), Optional.ofNullable(end)).stream()
        .map(this::toDto)
        .toList();
  }

  @PutMapping("/{dateISO}")
  public DayPlan upsert(@PathVariable String dateISO, @RequestBody DayPlan payload) {
    validateDate(dateISO);
    if (payload.getDateISO() == null || !payload.getDateISO().equals(dateISO)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Path date and payload date mismatch");
    }
    PlanDocument plan = new PlanDocument();
    plan.setId(payload.getDateISO());
    plan.setSlots(payload.getSlots());
    PlanDocument saved = planService.upsert(plan);
    return toDto(saved);
  }

  @DeleteMapping("/{dateISO}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable String dateISO) {
    validateDate(dateISO);
    try {
      planService.delete(dateISO);
    } catch (IllegalStateException exc) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan not found");
    }
  }

  private void validateDate(String value) {
    if (value == null || value.isBlank()) {
      return;
    }
    try {
      LocalDate.parse(value);
    } catch (DateTimeParseException exc) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date");
    }
  }

  private DayPlan toDto(PlanDocument plan) {
    DayPlan dto = new DayPlan();
    dto.setDateISO(plan.getId());
    dto.setSlots(plan.getSlots());
    return dto;
  }
}
