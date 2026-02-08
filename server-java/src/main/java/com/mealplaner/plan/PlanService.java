package com.mealplaner.plan;

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
    if (start.isPresent() && end.isPresent()) {
      return repository.findByUserIdAndDateIsoBetweenOrderByDateIsoAsc(userId, start.get(), end.get());
    }
    if (start.isPresent()) {
      return repository.findByUserIdAndDateIsoGreaterThanEqualOrderByDateIsoAsc(userId, start.get());
    }
    if (end.isPresent()) {
      return repository.findByUserIdAndDateIsoLessThanEqualOrderByDateIsoAsc(userId, end.get());
    }
    return repository.findByUserIdOrderByDateIsoAsc(userId);
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

  private String buildId(String userId, String dateIso) {
    return userId + ":" + dateIso;
  }
}
