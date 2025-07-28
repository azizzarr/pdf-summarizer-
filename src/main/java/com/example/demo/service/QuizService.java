package com.example.demo.service;

import org.json.JSONObject;
import org.json.JSONArray;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class QuizService {
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    
    @Value("${gemini.api.key}")
    private String geminiApiKey;

    public Map<String, Object> generateQuiz(String pdfContent) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Truncate content to avoid token limits
            String truncatedContent = pdfContent.substring(0, Math.min(pdfContent.length(), 8000));
            
            // Create prompt for quiz generation
            String prompt = "Based on the following educational content, create a quiz with exactly 10 multiple choice questions. " +
                          "Each question should have 4 options (A, B, C, D) with only one correct answer. " +
                          "Format your response EXACTLY as a JSON string with this structure (include the curly braces): " +
                          "{\"questions\":[{\"question\":\"What is X?\",\"options\":{\"A\":\"Option A\",\"B\":\"Option B\",\"C\":\"Option C\",\"D\":\"Option D\"},\"correctAnswer\":\"A\"}]} " +
                          "Make sure to escape any quotes in the questions or answers. Here's the content to create questions from:\n\n" + truncatedContent;

            // Prepare API URL with API key
            String apiUrlWithKey = GEMINI_API_URL + "?key=" + geminiApiKey;
            URL url = new URL(apiUrlWithKey);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);

            // Prepare the request body
            JSONObject requestBody = new JSONObject();
            JSONArray contents = new JSONArray();
            JSONObject content = new JSONObject();
            JSONArray parts = new JSONArray();
            JSONObject part = new JSONObject();
            part.put("text", prompt);
            parts.put(part);
            content.put("parts", parts);
            contents.put(content);
            requestBody.put("contents", contents);

            // Send the request
            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = requestBody.toString().getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }

            // Check for error response
            int responseCode = conn.getResponseCode();
            if (responseCode != 200) {
                BufferedReader errorReader = new BufferedReader(new InputStreamReader(conn.getErrorStream()));
                StringBuilder errorResponse = new StringBuilder();
                String line;
                while ((line = errorReader.readLine()) != null) {
                    errorResponse.append(line);
                }
                return Map.of("error", "Failed to generate quiz: " + errorResponse.toString());
            }

            // Read the response
            StringBuilder response = new StringBuilder();
            try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()))) {
                String responseLine;
                while ((responseLine = br.readLine()) != null) {
                    response.append(responseLine.trim());
                }
            }

            // Log the string to be parsed
            System.out.println("String to be parsed into JSONObject: " + response.toString());

            // Strip code block markers if present
            String responseStr = response.toString().trim();
            if (responseStr.startsWith("```")) {
                // Remove ```json or ``` if present at the start, and closing ``` at the end
                responseStr = responseStr.replaceFirst("(?s)^```json\\s*", "");
                responseStr = responseStr.replaceFirst("(?s)^```", "");
                if (responseStr.endsWith("```")) {
                    responseStr = responseStr.substring(0, responseStr.length() - 3).trim();
                }
            }

            // Parse the response
            JSONObject jsonResponse = new JSONObject(responseStr);
            if (jsonResponse.has("candidates") && jsonResponse.getJSONArray("candidates").length() > 0) {
                JSONObject candidate = jsonResponse.getJSONArray("candidates").getJSONObject(0);
                if (candidate.has("content")) {
                    JSONObject contentObj = candidate.getJSONObject("content");
                    if (contentObj.has("parts") && contentObj.getJSONArray("parts").length() > 0) {
                        JSONObject partObj = contentObj.getJSONArray("parts").getJSONObject(0);
                        if (partObj.has("text")) {
                            String quizText = partObj.getString("text");
                            // Strip code block markers from quizText if present
                            String cleanedQuizText = quizText.trim();
                            if (cleanedQuizText.startsWith("```")) {
                                cleanedQuizText = cleanedQuizText.replaceFirst("(?s)^```json\\s*", "");
                                cleanedQuizText = cleanedQuizText.replaceFirst("(?s)^```", "");
                                if (cleanedQuizText.endsWith("```")) {
                                    cleanedQuizText = cleanedQuizText.substring(0, cleanedQuizText.length() - 3).trim();
                                }
                            }
                            JSONObject quizJson = new JSONObject(cleanedQuizText);
                            result.put("quiz", quizJson.toMap());
                            result.put("success", true);
                        }
                    }
                }
            }

            return result;
        } catch (Exception e) {
            return Map.of("error", "Error generating quiz: " + e.getMessage());
        }
    }

    public Map<String, Object> evaluateQuiz(Map<String, Object> quizData, Map<String, String> userAnswers) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            Object quizObj = quizData.get("quiz");
            JSONObject quiz;
            if (quizObj instanceof JSONObject) {
                quiz = (JSONObject) quizObj;
            } else if (quizObj instanceof Map) {
                quiz = new JSONObject((Map<?, ?>) quizObj);
            } else {
                throw new IllegalArgumentException("Invalid quiz data format");
            }
            JSONArray questions = quiz.getJSONArray("questions");
            
            int correctAnswers = 0;
            int totalQuestions = questions.length();
            List<Map<String, Object>> questionResults = new ArrayList<>();
            
            for (int i = 0; i < totalQuestions; i++) {
                JSONObject question = questions.getJSONObject(i);
                String correctAnswer = question.getString("correctAnswer");
                String userAnswer = userAnswers.get("question_" + i);
                
                boolean isCorrect = correctAnswer.equals(userAnswer);
                if (isCorrect) {
                    correctAnswers++;
                }
                
                Map<String, Object> questionResult = new HashMap<>();
                questionResult.put("questionNumber", i + 1);
                questionResult.put("userAnswer", userAnswer);
                questionResult.put("correctAnswer", correctAnswer);
                questionResult.put("isCorrect", isCorrect);
                questionResult.put("question", question.getString("question"));
                
                questionResults.add(questionResult);
            }
            
            double score = (double) correctAnswers / totalQuestions * 100;
            
            result.put("totalQuestions", totalQuestions);
            result.put("correctAnswers", correctAnswers);
            result.put("score", Math.round(score * 100.0) / 100.0);
            result.put("percentage", String.format("%.1f%%", score));
            result.put("questionResults", questionResults);
            result.put("success", true);
            
        } catch (Exception e) {
            e.printStackTrace();
            result.put("error", "Error evaluating quiz: " + e.getMessage());
        }
        
        return result;
    }

    private JSONObject createFallbackQuiz() {
        JSONObject quiz = new JSONObject();
        JSONArray questions = new JSONArray();
        
        // Create 10 simple fallback questions
        for (int i = 1; i <= 10; i++) {
            JSONObject question = new JSONObject();
            question.put("question", "Question " + i + " (Please review the content for specific details)");
            
            JSONObject options = new JSONObject();
            options.put("A", "Option A");
            options.put("B", "Option B");
            options.put("C", "Option C");
            options.put("D", "Option D");
            question.put("options", options);
            question.put("correctAnswer", "A");
            
            questions.put(question);
        }
        
        quiz.put("questions", questions);
        return quiz;
    }
} 