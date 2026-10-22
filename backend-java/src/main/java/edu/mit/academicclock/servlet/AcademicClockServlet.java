package edu.mit.academicclock.servlet;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;

/**
 * CS23304 Unit V: "Java Servlets - Apache Tomcat"
 * Practical 2: "Develop servlet based applications"
 */
@WebServlet(name = "AcademicClockServlet", urlPatterns = "/servlet/academic-clock")
public class AcademicClockServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json;charset=UTF-8");
        PrintWriter out = resp.getWriter();

        out.println("{");
        out.println("  \"server\": \"Apache Tomcat / Jakarta Servlet 6.0\",");
        out.println("  \"course\": \"CS23304 Java Programming\",");
        out.println("  \"unit\": \"UNIT - V: WEB DEVELOPMENT AND FRAMEWORKS\",");
        out.println("  \"servletName\": \"AcademicClockServlet\",");
        out.println("  \"status\": \"Servlet responding with active JSON payload\",");
        out.println("  \"timestamp\": \"" + java.time.LocalDateTime.now() + "\"");
        out.println("}");
    }
}
