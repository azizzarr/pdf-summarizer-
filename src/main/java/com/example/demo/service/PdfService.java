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
    private SummarizationService summarizationService;

    public Map<String, Object> analyzePdf(MultipartFile file) throws IOException {
        Map<String, Object> result = new HashMap<>();
        
        try (PDDocument document = PDDocument.load(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);
            
            // Get page count
            int pageCount = document.getNumberOfPages();
            
            // For very large PDFs, truncate the text to avoid overwhelming the summarization service
            String truncatedText = text;
            if (text.length() > 10000) {
                // Take first 10000 characters for summarization
                truncatedText = text.substring(0, 10000) + "...";
                result.put("truncated", true);
            }
            
            // Generate summary
            String summary = summarizationService.summarizeText(truncatedText);
            
            // Calculate text statistics
            int wordCount = text.split("\\s+").length;
            int charCount = text.length();
            
            result.put("pageCount", pageCount);
            result.put("content", text);
            result.put("summary", summary);
            result.put("wordCount", wordCount);
            result.put("charCount", charCount);
            result.put("summaryWordCount", summary.split("\\s+").length);
            result.put("compressionRatio", String.format("%.2f", (float)summary.split("\\s+").length / wordCount * 100) + "%");
        } catch (IOException e) {
            throw new IOException("Error processing PDF: " + e.getMessage());
        }
        
        return result;
    }
} 