package com.example.demo.controller;

import com.example.demo.service.QuizService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/quiz")
public class QuizController {

    @Autowired
    private QuizService quizService;

    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generateQuiz(@RequestBody Map<String, String> request) {
        try {
            String pdfContent = request.get("content");
            if (pdfContent == null || pdfContent.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "PDF content is required"));
            }
            
            Map<String, Object> result = quizService.generateQuiz(pdfContent);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to generate quiz: " + e.getMessage()));
        }
    }

    @PostMapping("/evaluate")
    public ResponseEntity<Map<String, Object>> evaluateQuiz(@RequestBody Map<String, Object> request) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> quizData = (Map<String, Object>) request.get("quizData");
            @SuppressWarnings("unchecked")
            Map<String, String> userAnswers = (Map<String, String>) request.get("userAnswers");
            
            if (quizData == null || userAnswers == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Quiz data and user answers are required"));
            }
            
            Map<String, Object> result = quizService.evaluateQuiz(quizData, userAnswers);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to evaluate quiz: " + e.getMessage()));
        }
    }
} 