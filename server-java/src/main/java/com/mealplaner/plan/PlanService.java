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

  public List<PlanDocument> listPlans(Optional<String> start, Optional<String> end) {
    if (start.isPresent() && end.isPresent()) {
      return repository.findByIdBetweenOrderByIdAsc(start.get(), end.get());
    }
    if (start.isPresent()) {
      return repository.findByIdGreaterThanEqualOrderByIdAsc(start.get());
    }
    if (end.isPresent()) {
      return repository.findByIdLessThanEqualOrderByIdAsc(end.get());
    }
    return repository.findAll().stream()
        .sorted((a, b) -> a.getId().compareTo(b.getId()))
        .toList();
  }

  public PlanDocument upsert(PlanDocument plan) {
    return repository.save(plan);
  }

  public void delete(String id) {
    if (!repository.existsById(id)) {
      throw new IllegalStateException("Plan not found");
    }
    repository.deleteById(id);
  }
}
