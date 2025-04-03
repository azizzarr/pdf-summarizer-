package com.example.demo.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {
    
    @GetMapping("/")
    public String index() {
        return "Welcome to PDF Summarizer API";
    }

    @GetMapping("/api/health")
    public String health() {
        return "OK";
    }
}