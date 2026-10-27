package aacd.model;

public enum Material {
    PLA("PLA"),
    ABS("ABS"),
    PETG("PETG"),
    TPU("TPU (flexível)"),
    RESINA("Resina"),
    NYLON("Nylon");

    private final String rotulo;

    Material(String rotulo) { this.rotulo = rotulo; }

    public String getRotulo() { return rotulo; }
}