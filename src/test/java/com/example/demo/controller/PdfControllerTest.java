package com.example.demo.controller;

import com.example.demo.service.PdfService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashMap;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PdfController.class)
public class PdfControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PdfService pdfService;

    @Test
    public void analyzePdf_Success() throws Exception {
        // Create test data
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "test.pdf",
            "application/pdf",
            "PDF content".getBytes()
        );

        // Mock service response
        Map<String, Object> mockResult = new HashMap<>();
        mockResult.put("pageCount", 5);
        mockResult.put("content", "Sample PDF content");
        mockResult.put("summary", "This is a summary of the PDF content");

        when(pdfService.analyzePdf(any())).thenReturn(mockResult);

        // Perform request and verify
        mockMvc.perform(multipart("/api/pdf/analyze")
                .file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pageCount").value(5))
                .andExpect(jsonPath("$.content").value("Sample PDF content"))
                .andExpect(jsonPath("$.summary").value("This is a summary of the PDF content"));
    }

    @Test
    public void analyzePdf_Error() throws Exception {
        // Create test data
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "test.pdf",
            "application/pdf",
            "PDF content".getBytes()
        );

        // Mock service to throw exception
        when(pdfService.analyzePdf(any())).thenThrow(new RuntimeException("Error processing PDF"));

        // Perform request and verify
        mockMvc.perform(multipart("/api/pdf/analyze")
                .file(file))
                .andExpect(status().isBadRequest());
    }
} 