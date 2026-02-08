package com.mealplaner.config;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorResponse> handleException(Exception ex, HttpServletRequest request) {
    ErrorResponse body = new ErrorResponse(
        "UNEXPECTED_ERROR",
        ex.getMessage(),
        request.getRequestURI(),
        Instant.now().toString()
    );
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
  }

  public record ErrorResponse(String code, String message, String path, String timestamp) {}
}
