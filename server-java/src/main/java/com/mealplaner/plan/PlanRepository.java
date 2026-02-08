package com.mealplaner.plan;

import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PlanRepository extends MongoRepository<PlanDocument, String> {
  List<PlanDocument> findByIdBetweenOrderByIdAsc(String start, String end);
  List<PlanDocument> findByIdGreaterThanEqualOrderByIdAsc(String start);
  List<PlanDocument> findByIdLessThanEqualOrderByIdAsc(String end);
}
