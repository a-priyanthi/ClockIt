package edu.mit.academicclock.model;

import java.io.Serializable;

/**
 * CS23304 Unit I & Unit IV: Object Oriented Design, Encapsulation, Serialization
 */
public class Subject implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long id;
    private String code;
    private String name;
    private Integer units;
    private Integer lectureHours;
    private Integer practicalHours;
    private Integer credits;
    private Integer progress;
    private Integer attended;
    private Integer total;

    public Subject() {}

    public Subject(String code, String name, Integer units, Integer lectureHours, Integer practicalHours, Integer credits, Integer progress, Integer attended, Integer total) {
        this.code = code;
        this.name = name;
        this.units = units;
        this.lectureHours = lectureHours;
        this.practicalHours = practicalHours;
        this.credits = credits;
        this.progress = progress;
        this.attended = attended;
        this.total = total;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getUnits() { return units; }
    public void setUnits(Integer units) { this.units = units; }

    public Integer getLectureHours() { return lectureHours; }
    public void setLectureHours(Integer lectureHours) { this.lectureHours = lectureHours; }

    public Integer getPracticalHours() { return practicalHours; }
    public void setPracticalHours(Integer practicalHours) { this.practicalHours = practicalHours; }

    public Integer getCredits() { return credits; }
    public void setCredits(Integer credits) { this.credits = credits; }

    public Integer getProgress() { return progress; }
    public void setProgress(Integer progress) { this.progress = progress; }

    public Integer getAttended() { return attended; }
    public void setAttended(Integer attended) { this.attended = attended; }

    public Integer getTotal() { return total; }
    public void setTotal(Integer total) { this.total = total; }

    public double getAttendancePercentage() {
        if (total == null || total == 0) return 100.0;
        return Math.round(((double) attended / total) * 100.0);
    }
}
