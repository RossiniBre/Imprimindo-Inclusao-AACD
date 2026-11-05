package aacd.model;

import java.util.Set;

public class Endereco {

    private final String cep;
    private final String rua;
    private final String numero;
    private final String bairro;
    private final String cidade;
    private final String uf;

    public Endereco(String cep, String rua, String numero,
                    String bairro, String cidade, String uf) {
        this.cep = normalizarCep(cep);
        this.rua = obrigatorio(rua, "Rua");
        this.numero = obrigatorio(numero, "Número");
        this.bairro = obrigatorio(bairro, "Bairro");
        this.cidade = obrigatorio(cidade, "Cidade");
        this.uf = validarUf(uf);
    }

    private static String normalizarCep(String cep) {
        String digitos = obrigatorio(cep, "CEP").replaceAll("\\D", "");
        if (digitos.length() != 8) {
            throw new IllegalArgumentException("CEP deve ter 8 dígitos");
        }
        return digitos;
    }

    private static final Set<String> UFS = Set.of(
            "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
            "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
    );

    private static String validarUf(String uf) {
        String valor = obrigatorio(uf, "UF").toUpperCase();
        if (!UFS.contains(valor)) {
            throw new IllegalArgumentException("UF inválida");
        }
        return valor;
    }

    private static String obrigatorio(String valor, String campo) {
        if (valor == null || valor.isBlank()) {
            throw new IllegalArgumentException(campo + " é obrigatório");
        }
        return valor.trim();
    }

    public String getCep() { return cep; }
    public String getRua() { return rua; }
    public String getNumero() { return numero; }
    public String getBairro() { return bairro; }
    public String getCidade() { return cidade; }
    public String getUf() { return uf; }
}