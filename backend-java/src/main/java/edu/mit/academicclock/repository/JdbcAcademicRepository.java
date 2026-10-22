package edu.mit.academicclock.repository;

import edu.mit.academicclock.model.Subject;
import org.springframework.stereotype.Repository;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * CS23304 Unit IV: "Databases with JDBC"
 * Practical 3: "Develop applications with Database Connectivity"
 */
@Repository
public class JdbcAcademicRepository {

    private final String dbUrl = "jdbc:sqlite:thryve.db";

    public JdbcAcademicRepository() {
        // Load SQLite JDBC Driver
        try {
            Class.forName("org.sqlite.JDBC");
        } catch (ClassNotFoundException e) {
            System.err.println("SQLite JDBC Driver not found: " + e.getMessage());
        }
    }

    private Connection getConnection() throws SQLException {
        return DriverManager.getConnection(dbUrl);
    }

    public List<Subject> findAllSubjects() {
        List<Subject> subjects = new ArrayList<>();
        String sql = "SELECT code, name, units, lecture_hours, practical_hours, credits, progress, attended, total FROM academic_subjects ORDER BY id ASC";

        try (Connection conn = getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

            while (rs.next()) {
                Subject s = new Subject(
                    rs.getString("code"),
                    rs.getString("name"),
                    rs.getInt("units"),
                    rs.getInt("lecture_hours"),
                    rs.getInt("practical_hours"),
                    rs.getInt("credits"),
                    rs.getInt("progress"),
                    rs.getInt("attended"),
                    rs.getInt("total")
                );
                subjects.add(s);
            }
        } catch (SQLException e) {
            System.err.println("JDBC Query Error: " + e.getMessage());
        }
        return subjects;
    }

    public boolean recordAttendance(String subjectCode, boolean isPresent) {
        String updateSql = isPresent
            ? "UPDATE academic_subjects SET total = total + 1, attended = attended + 1 WHERE code = ?"
            : "UPDATE academic_subjects SET total = total + 1 WHERE code = ?";

        try (Connection conn = getConnection();
             PreparedStatement stmt = conn.prepareStatement(updateSql)) {
            stmt.setString(1, subjectCode);
            int rows = stmt.executeUpdate();
            return rows > 0;
        } catch (SQLException e) {
            System.err.println("JDBC Update Error: " + e.getMessage());
            return false;
        }
    }
}
