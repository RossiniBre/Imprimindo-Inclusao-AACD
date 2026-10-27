package aacd.http;

import java.util.List;

public final class Json {

    private Json() {}

    public static String texto(String valor) {
        if (valor == null) return "null";

        StringBuilder sb = new StringBuilder("\"");
        for (char c : valor.toCharArray()) {
            switch (c) {
                case '"':  sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n");  break;
                case '\r': sb.append("\\r");  break;
                case '\t': sb.append("\\t");  break;
                default:
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
            }
        }
        return sb.append('"').toString();
    }

    public static Objeto objeto() {
        return new Objeto();
    }

    public static String lista(List<String> itensJson) {
        return "[" + String.join(",", itensJson) + "]";
    }

    public static final class Objeto {
        private final StringBuilder sb = new StringBuilder("{");
        private boolean vazio = true;

        private Objeto adicionar(String nome, String valorJson) {
            if (!vazio) sb.append(',');
            sb.append(texto(nome)).append(':').append(valorJson);
            vazio = false;
            return this;
        }

        public Objeto campo(String nome, String valor)  { return adicionar(nome, texto(valor)); }
        public Objeto campo(String nome, long valor)    { return adicionar(nome, Long.toString(valor)); }
        public Objeto campo(String nome, boolean valor) { return adicionar(nome, Boolean.toString(valor)); }

        public Objeto campoJson(String nome, String jsonPronto) { return adicionar(nome, jsonPronto); }

        public String build() {
            return sb + "}";
        }
    }
}