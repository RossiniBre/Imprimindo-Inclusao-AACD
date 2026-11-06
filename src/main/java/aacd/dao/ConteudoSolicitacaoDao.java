package aacd.dao;

import aacd.model.ConteudoSolicitacao;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Projections;
import org.bson.Document;
import org.bson.types.ObjectId;

import java.util.*;

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
                .append("comprimentoMm", conteudo.getComprimentoMm())
                .append("larguraMm", conteudo.getLarguraMm())
                .append("alturaMm", conteudo.getAlturaMm())
                .append("arquivoId", conteudo.getArquivoId())
                .append("nomeArquivo", conteudo.getNomeArquivo());
        colecao.insertOne(doc);
        return doc.getObjectId("_id").toHexString();
    }

    public record Medidas(int comprimentoMm, int larguraMm, int alturaMm) {}

    public Map<String, Medidas> buscarMedidas(Collection<String> mongoIds) {
        Map<String, Medidas> mapa = new HashMap<>();
        List<ObjectId> ids = mongoIds.stream()
                .filter(ObjectId::isValid)
                .map(ObjectId::new)
                .toList();
        if (ids.isEmpty()) return mapa;

        colecao.find(Filters.in("_id", ids))
                .projection(Projections.include("comprimentoMm", "larguraMm", "alturaMm"))
                .forEach(doc -> mapa.put(
                        doc.getObjectId("_id").toHexString(),
                        new Medidas(doc.getInteger("comprimentoMm"),
                                doc.getInteger("larguraMm"),
                                doc.getInteger("alturaMm"))));
        return mapa;
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
                doc.getInteger("comprimentoMm"),
                doc.getInteger("larguraMm"),
                doc.getInteger("alturaMm"),
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