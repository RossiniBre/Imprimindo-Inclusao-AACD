package aacd.dao;

import aacd.model.ConteudoSolicitacao;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import org.bson.Document;
import org.bson.types.ObjectId;

import java.util.Optional;

public class ConteudoSolicitacaoDao {
    private static final String COLECAO = "solicitacoes";

    private final MongoCollection<Document> colecao;

    public ConteudoSolicitacaoDao(MongoDatabase database) {
        this.colecao = database.getCollection(COLECAO);
    }

    public String inserir(ConteudoSolicitacao conteudo) {
        Document doc = new Document("titulo", conteudo.getTitulo())
                .append("descricao", conteudo.getDescricao())
                .append("quantidade", conteudo.getQuantidade())
                .append("arquivoId", conteudo.getArquivoId())
                .append("nomeArquivo", conteudo.getNomeArquivo());
        colecao.insertOne(doc);
        return doc.getObjectId("_id").toHexString();
    }

    public Optional<ConteudoSolicitacao> buscarPorId(String mongoId) {
        if (mongoId == null || !ObjectId.isValid(mongoId)) {
            return Optional.empty();
        }
        Document doc = colecao.find(Filters.eq("_id", new ObjectId(mongoId))).first();
        if (doc == null) {
            return Optional.empty();
        }
        return Optional.of(new ConteudoSolicitacao(
                mongoId,
                doc.getString("titulo"),
                doc.getString("descricao"),
                doc.getInteger("quantidade"),
                doc.getString("arquivoId"),
                doc.getString("nomeArquivo")));
    }

    public void apagar(String mongoId) {
        if (mongoId == null || !ObjectId.isValid(mongoId)) {
            return;
        }
        colecao.deleteOne(Filters.eq("_id", new ObjectId(mongoId)));
    }
}