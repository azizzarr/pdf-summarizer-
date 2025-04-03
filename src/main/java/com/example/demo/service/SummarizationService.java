package com.example.demo.service;

import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

@Service
public class SummarizationService {
    private static final String HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models/sshleifer/distilbart-cnn-6-6";
    
    @Value("${huggingface.api.key}")
    private String huggingFaceApiKey;

    public String summarizeText(String text) {
        if (text == null || text.trim().isEmpty()) {
            return "No text to summarize";
        }

        if (huggingFaceApiKey == null || huggingFaceApiKey.trim().isEmpty()) {
            System.err.println("API Key is null or empty");
            return "Error: API key is not configured properly";
        }

        System.out.println("Using API Key: " + huggingFaceApiKey.substring(0, 8) + "...");

        try {
            // Truncate text to avoid token limits
            String truncatedText = text.substring(0, Math.min(text.length(), 1024));

            URL url = new URL(HUGGINGFACE_API_URL);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Authorization", "Bearer " + huggingFaceApiKey.trim());
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);

            // Calculate max_length based on input length (should be shorter than input)
            int maxLength = Math.min(truncatedText.length() - 1, 130);
            int minLength = Math.min(truncatedText.length() / 3, 30);

            // Prepare the request body
            JSONObject jsonInput = new JSONObject();
            jsonInput.put("inputs", truncatedText);
            jsonInput.put("parameters", new JSONObject()
                .put("max_length", maxLength)
                .put("min_length", minLength)
                .put("do_sample", false));

            // Send the request
            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = jsonInput.toString().getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }

            // Check for error response
            int responseCode = conn.getResponseCode();
            System.out.println("Response Code: " + responseCode);

            if (responseCode != 200) {
                BufferedReader errorReader = new BufferedReader(new InputStreamReader(conn.getErrorStream()));
                StringBuilder errorResponse = new StringBuilder();
                String line;
                while ((line = errorReader.readLine()) != null) {
                    errorResponse.append(line);
                }
                System.err.println("Error Response: " + errorResponse.toString());
                
                if (responseCode == 401) {
                    return "Error: Invalid or missing API key. Please check your Hugging Face API key configuration. Response: " + errorResponse.toString();
                } else {
                    return "Error: Unable to generate summary (HTTP " + responseCode + "). Response: " + errorResponse.toString();
                }
            }

            // Read the response
            StringBuilder response = new StringBuilder();
            try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                String responseLine;
                while ((responseLine = br.readLine()) != null) {
                    response.append(responseLine.trim());
                }
            }

            System.out.println("Response: " + response.toString());

            // Parse the response
            JSONArray jsonArray = new JSONArray(response.toString());
            if (jsonArray.length() > 0) {
                JSONObject firstResult = jsonArray.getJSONObject(0);
                if (firstResult.has("summary_text")) {
                    return firstResult.getString("summary_text");
                }
            }
            
            return "Unable to generate summary from the response";

        } catch (Exception e) {
            e.printStackTrace();
            return "Error generating summary: " + e.getMessage();
        }
    }
} 