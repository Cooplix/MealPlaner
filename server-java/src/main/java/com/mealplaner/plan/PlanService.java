package com.mealplaner.plan;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class PlanService {
  private final PlanRepository repository;

  public PlanService(PlanRepository repository) {
    this.repository = repository;
  }

  public List<PlanDocument> listPlans(String userId, Optional<String> start, Optional<String> end) {
    claimLegacyPlans(userId);
    List<PlanDocument> plans = repository.findByUserIdOrderByDateIsoAsc(userId);
    if (start.isEmpty() && end.isEmpty()) {
      return plans;
    }
    Optional<LocalDate> startDate = parseDate(start);
    Optional<LocalDate> endDate = parseDate(end);
    return plans.stream()
        .filter(plan -> {
          LocalDate date = parseDate(Optional.ofNullable(plan.getDateIso())).orElse(null);
          if (date == null) {
            return false;
          }
          if (startDate.isPresent() && date.isBefore(startDate.get())) {
            return false;
          }
          if (endDate.isPresent() && date.isAfter(endDate.get())) {
            return false;
          }
          return true;
        })
        .toList();
  }

  public PlanDocument upsert(String userId, PlanDocument plan) {
    claimLegacyPlans(userId);
    String dateIso = plan.getDateIso();
    if (dateIso == null || dateIso.isBlank()) {
      throw new IllegalArgumentException("dateISO is required");
    }
    PlanDocument target = repository.findByUserIdAndDateIso(userId, dateIso).orElseGet(PlanDocument::new);
    if (target.getId() == null || target.getId().isBlank()) {
      target.setId(buildId(userId, dateIso));
    }
    target.setUserId(userId);
    target.setDateIso(dateIso);
    target.setSlots(plan.getSlots());
    return repository.save(target);
  }

  public void delete(String userId, String dateIso) {
    claimLegacyPlans(userId);
    PlanDocument existing = repository.findByUserIdAndDateIso(userId, dateIso).orElseThrow();
    repository.deleteById(existing.getId());
  }

  private void claimLegacyPlans(String userId) {
    List<PlanDocument> legacy = repository.findByUserIdIsNull();
    if (legacy.isEmpty()) {
      return;
    }
    for (PlanDocument plan : legacy) {
      String dateIso = plan.getDateIso();
      if (dateIso == null || dateIso.isBlank()) {
        dateIso = plan.getId();
      }
      if (dateIso == null || dateIso.isBlank()) {
        continue;
      }
      if (repository.findByUserIdAndDateIso(userId, dateIso).isPresent()) {
        repository.deleteById(plan.getId());
        continue;
      }
      PlanDocument claimed = new PlanDocument();
      claimed.setId(buildId(userId, dateIso));
      claimed.setUserId(userId);
      claimed.setDateIso(dateIso);
      claimed.setSlots(plan.getSlots());
      repository.save(claimed);
      if (!claimed.getId().equals(plan.getId())) {
        repository.deleteById(plan.getId());
      }
    }
  }

  private Optional<LocalDate> parseDate(Optional<String> raw) {
    if (raw.isEmpty()) {
      return Optional.empty();
    }
    try {
      return Optional.of(LocalDate.parse(raw.get()));
    } catch (Exception exc) {
      return Optional.empty();
    }
  }

  private String buildId(String userId, String dateIso) {
    return userId + ":" + dateIso;
  }
}
