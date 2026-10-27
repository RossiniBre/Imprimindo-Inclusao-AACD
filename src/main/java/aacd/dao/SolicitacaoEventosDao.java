package aacd.dao;

import aacd.config.MongoFactory;
import aacd.model.StatusSolicitacao;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.UpdateOptions;
import com.mongodb.client.model.Updates;
import org.bson.Document;
import org.bson.conversions.Bson;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class SolicitacaoEventosDao {

    private MongoCollection<Document> colecao() {
        return MongoFactory.getDatabase().getCollection("solicitacao_eventos");
    }

    public void registrarEvento(int solicitacaoId, StatusSolicitacao anterior,
            StatusSolicitacao novo, int usuarioId,
            String observacao, LocalDate prazo) {
        Document evento = new Document("statusAnterior", anterior.name())
                .append("statusNovo", novo.name())
                .append("usuarioId", usuarioId)
                .append("observacao", observacao)
                .append("data", new Date());
        List<Bson> mudancas = new ArrayList<>();
        mudancas.add(Updates.push("historico", evento));
        if (prazo != null) {
            mudancas.add(Updates.set("prazoEstimado", prazo.toString())); // AAAA-MM-DD
        }

        colecao().updateOne(
                Filters.eq("_id", solicitacaoId),
                Updates.combine(mudancas),
                new UpdateOptions().upsert(true));
    }

    public void apagar(int solicitacaoId) {
        colecao().deleteOne(Filters.eq("_id", solicitacaoId));
    }

    public Document buscar(int solicitacaoId) {
        return colecao().find(Filters.eq("_id", solicitacaoId)).first();
    }
}
