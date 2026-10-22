package edu.mit.academicclock.controller;

import edu.mit.academicclock.model.Subject;
import edu.mit.academicclock.repository.JdbcAcademicRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * CS23304 Unit V: "Design a Java Web application using Spring Boot"
 * Practical 3: REST API Controllers with Spring Boot
 */
@RestController
@RequestMapping("/api/java/academic")
@CrossOrigin(origins = "*")
public class AcademicClockController {

    private final JdbcAcademicRepository repository;

    @Autowired
    public AcademicClockController(JdbcAcademicRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> resp = new HashMap<>();
        resp.put("status", "UP");
        resp.put("framework", "Spring Boot 3.3 / Java 21");
        resp.put("course", "CS23304: Java Programming");
        resp.put("module", "Unit IV (JDBC) & Unit V (Web Frameworks)");
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/subjects")
    public ResponseEntity<Map<String, Object>> getSubjects() {
        List<Subject> subjects = repository.findAllSubjects();
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("source", "Spring Boot JDBC Repository");
        resp.put("subjects", subjects);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/attendance")
    public ResponseEntity<Map<String, Object>> recordAttendance(@RequestBody Map<String, String> payload) {
        String code = payload.get("subjectCode");
        String status = payload.get("status");
        boolean isPresent = "present".equalsIgnoreCase(status);

        boolean updated = repository.recordAttendance(code, isPresent);
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", updated);
        resp.put("message", updated ? "Attendance recorded successfully via JDBC" : "Failed to record attendance");
        return ResponseEntity.ok(resp);
    }
}
