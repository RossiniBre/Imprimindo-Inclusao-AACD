package aacd.model;

import aacd.util.EmailValidador;
import aacd.util.Identificador;

public class Empresa {
    private int id;
    private int usuarioId;
    private String email;
    private String cnpj;
    private String telefone;
    private Endereco endereco;

    public Empresa(int id, int usuarioId, String email, String telefone, String cnpj, Endereco endereco) {

        setEmail(email);
        setTelefone(telefone);
        setCnpj(cnpj);
        setEndereco(endereco);

        if (usuarioId <= 0) {
            throw new IllegalArgumentException("Usuário inválido!");
        }
        this.usuarioId = usuarioId;
        this.id = id;
    }

    public Empresa(int usuarioId, String email, String telefone, String cnpj, Endereco endereco){
        this(0, usuarioId, email, telefone, cnpj, endereco);
    }

    //getters
    public int getId(){ return this.id; }
    public int getUsuarioId(){ return this.usuarioId; }
    public String getEmail(){ return this.email; }
    public String getTelefone(){ return this.telefone; }
    public String getCnpj(){ return this.cnpj; }
    public Endereco getEndereco() { return this.endereco; }

    //setter
    public void setId(int id){
        if (id > 0){
            this.id = id;
        } else {
            throw new IllegalArgumentException("ID inválido!");
        }
    }

    public void setCnpj(String cnpj) {
        cnpj = cnpj == null ? null : Identificador.normalizar(cnpj);

        if (!isCnpjValido(cnpj)) {
            throw new IllegalArgumentException("CNPJ inválido!");
        }

        this.cnpj = cnpj;
    }

    public void setTelefone(String telefone) {
        if (telefone == null || !telefone.matches("\\d{11}")) {
            throw new IllegalArgumentException("Telefone deve conter 11 dígitos!");
        }
        this.telefone = telefone;
    }

    public void setEmail(String email) {
        String erro = EmailValidador.validarLivre(email);
        if (erro != null) {
            throw new IllegalArgumentException(erro);
        }
        this.email = EmailValidador.normalizar(email);
    }

    public void setEndereco(Endereco endereco) {
        if (endereco == null) {
            throw new IllegalArgumentException("Endereço é obrigatório!");
        }
        this.endereco = endereco;
    }

    //metodos

    // pesquisa de validacao feita com IA
    private boolean isCnpjValido(String cnpj) {
        if (cnpj == null || !cnpj.matches("[A-Z0-9]{12}\\d{2}")) {
            return false;
        }
        if (cnpj.matches("(.)\\1{13}")) {
            return false;
        }

        int[] pesos1 = {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int[] pesos2 = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};

        int soma = 0;

        for (int i = 0; i < 12; i++) {
            soma += (cnpj.charAt(i) - '0') * pesos1[i];
        }

        int resto = soma % 11;
        int digito1 = resto < 2 ? 0 : 11 - resto;

        if (digito1 != Character.getNumericValue(cnpj.charAt(12))) {
            return false;
        }

        soma = 0;

        for (int i = 0; i < 13; i++) {
            soma += (cnpj.charAt(i) - '0') * pesos2[i];
        }

        resto = soma % 11;
        int digito2 = resto < 2 ? 0 : 11 - resto;

        return digito2 == Character.getNumericValue(cnpj.charAt(13));
    }

    public String getCnpjFormatado() {
        return cnpj.substring(0, 2) + "." +
                cnpj.substring(2, 5) + "." +
                cnpj.substring(5, 8) + "/" +
                cnpj.substring(8, 12) + "-" +
                cnpj.substring(12, 14);
    }

    public String getTelefoneFormatado() {
        return "(" + telefone.substring(0, 2) + ") " +
                telefone.substring(2, 7) + "-" +
                telefone.substring(7, 11);
    }
}