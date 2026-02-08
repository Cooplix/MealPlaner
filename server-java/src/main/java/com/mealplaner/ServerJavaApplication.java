package com.mealplaner;

import com.mealplaner.config.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class ServerJavaApplication {
  public static void main(String[] args) {
    SpringApplication.run(ServerJavaApplication.class, args);
  }
}
