package edu.mit.academicclock;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.web.servlet.ServletComponentScan;

/**
 * MIT Academic Clock - Main Spring Boot Application
 * Represents CS23304 Unit V: "Design a Java Web application using Spring Boot"
 */
@SpringBootApplication
@ServletComponentScan
public class AcademicClockApplication {

    public static void main(String[] args) {
        System.out.println("==================================================");
        System.out.println("🏛️ MIT Academic Clock — Spring Boot Java Backend");
        System.out.println("📖 CS23304: Java Programming (Unit IV JDBC & Unit V Spring Boot)");
        System.out.println("==================================================");
        SpringApplication.run(AcademicClockApplication.class, args);
    }
}
