package com.example.demo.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(properties = {
    "huggingface.api.key=test_api_key"
})
public class SummarizationServiceTest {

    @Autowired
    private SummarizationService summarizationService;

    @Test
    public void testSummarizeText() {
        String text = "This is a test text that should be summarized.";
        String summary = summarizationService.summarizeText(text);
        assertNotNull(summary);
        assertTrue(summary.length() < text.length());
    }
} 