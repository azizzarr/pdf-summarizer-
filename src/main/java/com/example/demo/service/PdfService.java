package com.example.demo.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Service
public class PdfService {
    
    @Autowired
    private GeminiService geminiService;

    public Map<String, Object> analyzePdf(MultipartFile file) throws IOException {
        Map<String, Object> result = new HashMap<>();
        
        try (PDDocument document = PDDocument.load(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);
            
            // Get page count
            int pageCount = document.getNumberOfPages();
            
            // For very large PDFs, truncate the text to avoid overwhelming the AI model
            String truncatedText = text;
            if (text.length() > 10000) {
                // Take first 10000 characters for summarization
                truncatedText = text.substring(0, 10000) + "...";
                result.put("truncated", true);
            }
            
            // Generate summary using Gemini API
            String summary = geminiService.summarizeText(truncatedText);
            
            // Calculate text statistics
            int wordCount = text.split("\\s+").length;
            int charCount = text.length();
            int summaryWordCount = summary.split("\\s+").length;
            
            result.put("pageCount", pageCount);
            result.put("content", text);
            result.put("summary", summary);
            result.put("wordCount", wordCount);
            result.put("charCount", charCount);
            result.put("summaryWordCount", summaryWordCount);
            result.put("compressionRatio", String.format("%.2f", (float)summaryWordCount / wordCount * 100) + "%");
        } catch (IOException e) {
            throw new IOException("Error processing PDF: " + e.getMessage());
        }
        
        return result;
    }
} 