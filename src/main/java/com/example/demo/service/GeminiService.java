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

@Service
public class GeminiService {
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    
    @Value("${gemini.api.key}")
    private String geminiApiKey;

    public String summarizeText(String text) {
        if (text == null || text.trim().isEmpty()) {
            return "No text to summarize";
        }

        try {
            // Truncate text to avoid token limits (if needed)
            String truncatedText = text.substring(0, Math.min(text.length(), 10000));
            
            // Create prompt for better summarization
            String prompt = "Please provide a concise summary of the following text, highlighting the key points and main ideas: \n\n" + truncatedText;

            // Prepare API URL with API key
            String apiUrlWithKey = GEMINI_API_URL + "?key=" + geminiApiKey;
            URL url = new URL(apiUrlWithKey);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);

            // Prepare the request body according to Gemini API format
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
                System.err.println("Error response from Gemini API: " + errorResponse.toString());
                return "Error: Failed to generate summary. " + errorResponse.toString();
            }

            // Read the response
            StringBuilder response = new StringBuilder();
            try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()))) {
                String responseLine;
                while ((responseLine = br.readLine()) != null) {
                    response.append(responseLine.trim());
                }
            }

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

            // Parse the response to extract the summary
            JSONObject jsonResponse = new JSONObject(responseStr);
            if (jsonResponse.has("candidates") && jsonResponse.getJSONArray("candidates").length() > 0) {
                JSONObject candidate = jsonResponse.getJSONArray("candidates").getJSONObject(0);
                if (candidate.has("content")) {
                    JSONObject contentObj = candidate.getJSONObject("content");
                    if (contentObj.has("parts") && contentObj.getJSONArray("parts").length() > 0) {
                        return contentObj.getJSONArray("parts").getJSONObject(0).getString("text");
                    }
                }
            }
            
            return "Unable to generate summary from the response";

        } catch (Exception e) {
            e.printStackTrace();
            return "Error generating summary: " + e.getMessage();
        }
    }
} 