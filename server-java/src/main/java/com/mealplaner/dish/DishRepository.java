package com.mealplaner.dish;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface DishRepository extends MongoRepository<DishDocument, String> {}
