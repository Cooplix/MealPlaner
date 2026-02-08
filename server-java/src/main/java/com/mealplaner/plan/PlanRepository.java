package com.mealplaner.plan;

import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PlanRepository extends MongoRepository<PlanDocument, String> {
  List<PlanDocument> findByUserIdAndDateIsoBetweenOrderByDateIsoAsc(String userId, String start, String end);
  List<PlanDocument> findByUserIdAndDateIsoGreaterThanEqualOrderByDateIsoAsc(String userId, String start);
  List<PlanDocument> findByUserIdAndDateIsoLessThanEqualOrderByDateIsoAsc(String userId, String end);
  List<PlanDocument> findByUserIdOrderByDateIsoAsc(String userId);
  Optional<PlanDocument> findByUserIdAndDateIso(String userId, String dateIso);
  List<PlanDocument> findByUserIdIsNull();
}
