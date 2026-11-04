package aacd.model;

import aacd.util.EmailValidador;

public class Funcionario {
    private int id;
    private int usuarioId;
    private String email;
    private String cargo;
    private String setor;

    public Funcionario(int id, int usuarioId, String email, String cargo, String setor) {
        if (usuarioId <= 0) {
            throw new IllegalArgumentException("Usuário inválido!");
        }
        this.usuarioId = usuarioId;

        setEmail(email);
        setCargo(cargo);
        setSetor(setor);

        this.id = id;
    }

    public Funcionario(int usuarioId, String email, String cargo, String setor) {
        this(0, usuarioId, email, cargo, setor);
    }

    //getters
    public int getId() { return this.id; }
    public int getUsuarioId() { return this.usuarioId; }
    public String getEmail() { return this.email; }
    public String getCargo() { return this.cargo; }
    public String getSetor() { return this.setor; }

    //setters
    public void setId(int id) {
        if (id > 0) {
            this.id = id;
        } else {
            throw new IllegalArgumentException("ID inválido!");
        }
    }

    public void setEmail(String email) {
        String erro = EmailValidador.validar(email);
        if (erro != null) {
            throw new IllegalArgumentException(erro);
        }
        this.email = EmailValidador.normalizar(email);
    }

    public void setCargo(String cargo) {
        this.cargo = normalizar(cargo, "Cargo");
    }

    public void setSetor(String setor) {
        this.setor = normalizar(setor, "Setor");
    }

    //metodos
    private static String normalizar(String texto, String campo) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        String valor = texto.trim();
        if (valor.length() > 45) {
            throw new IllegalArgumentException(campo + " deve ter no máximo 45 caracteres!");
        }
        return valor;
    }
}