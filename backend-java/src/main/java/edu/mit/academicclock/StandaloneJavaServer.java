package edu.mit.academicclock;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

/**
 * CS23304 Unit V: Web Development and Frameworks
 * Standalone Java HTTP Server implementing REST endpoints for MIT Academic Clock
 * Runs directly on Java 21+ without any external Maven dependencies!
 */
public class StandaloneJavaServer {

    public static void main(String[] args) throws IOException {
        int port = 8080;
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);

        // Root / Health endpoint
        server.createContext("/api/java/health", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) throws IOException {
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
                String response = "{"
                    + "\"status\":\"UP\","
                    + "\"course\":\"CS23304 Java Programming\","
                    + "\"server\":\"Java SE Built-in HTTP Server\","
                    + "\"unit\":\"Unit IV (JDBC) & Unit V (Web Frameworks)\","
                    + "\"timestamp\":\"" + java.time.LocalDateTime.now() + "\""
                    + "}";
                byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(200, bytes.length);
                OutputStream os = exchange.getResponseBody();
                os.write(bytes);
                os.close();
            }
        });

        // Syllabus endpoint for CS23304
        server.createContext("/api/java/syllabus", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) throws IOException {
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
                String response = "{"
                    + "\"courseCode\":\"CS23304\","
                    + "\"courseTitle\":\"JAVA PROGRAMMING\","
                    + "\"ltpc\":\"3 0 4 5\","
                    + "\"periods\":\"45L + 60P = 105 PERIODS\","
                    + "\"units\":["
                    + "{\"unit\":\"UNIT - I\",\"title\":\"INTRODUCTION TO JAVA\",\"periods\":\"9L, 12P\"},"
                    + "{\"unit\":\"UNIT - II\",\"title\":\"POLYMORPHISM AND INHERITANCE\",\"periods\":\"9L, 12P\"},"
                    + "{\"unit\":\"UNIT - III\",\"title\":\"EXCEPTION HANDLING AND MULTITHREADING\",\"periods\":\"8L, 12P\"},"
                    + "{\"unit\":\"UNIT - IV\",\"title\":\"FILE STREAMS AND DATABASE\",\"periods\":\"9L, 12P\"},"
                    + "{\"unit\":\"UNIT - V\",\"title\":\"WEB DEVELOPMENT AND FRAMEWORKS\",\"periods\":\"10L, 12P\"}"
                    + "]"
                    + "}";
                byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(200, bytes.length);
                OutputStream os = exchange.getResponseBody();
                os.write(bytes);
                os.close();
            }
        });

        server.setExecutor(null); // default executor
        System.out.println("==================================================");
        System.out.println("☕ Standalone CS23304 Java HTTP Server Started");
        System.out.println("☕ URL: http://localhost:" + port + "/api/java/health");
        System.out.println("☕ Syllabus: http://localhost:" + port + "/api/java/syllabus");
        System.out.println("==================================================");
        server.start();
    }
}
