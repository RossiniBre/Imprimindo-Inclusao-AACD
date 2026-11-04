package aacd.model;

public class SolicitacaoParaExcluir {
    private final int id;
    private final String mongoId;

    public SolicitacaoParaExcluir(int id, String mongoId) {
        this.id = id;
        this.mongoId = mongoId;
    }

    public int getId() { return id; }
    public String getMongoId() { return mongoId; }
}