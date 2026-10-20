package aacd.dao;

import aacd.config.MongoFactory;
import aacd.model.Material;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.ReplaceOptions;
import org.bson.Document;

import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

public class ImpressoraMateriaisDao {

    private MongoCollection<Document> colecao() {
        return MongoFactory.getDatabase().getCollection("impressora_materiais");
    }

    public void salvar(int impressoraId, Set<Material> materiais) {
        List<String> nomes = materiais.stream().map(Material::name).toList();
        colecao().replaceOne(
                Filters.eq("_id", impressoraId),
                new Document("_id", impressoraId).append("materiais", nomes),
                new ReplaceOptions().upsert(true));
    }

    public Set<Material> buscar(int impressoraId) {
        Set<Material> resultado = EnumSet.noneOf(Material.class);
        Document doc = colecao().find(Filters.eq("_id", impressoraId)).first();
        if (doc == null) return resultado;

        List<String> nomes = doc.getList("materiais", String.class);
        if (nomes == null) return resultado;

        for (String nome : nomes) {
            try {
                resultado.add(Material.valueOf(nome));
            } catch (IllegalArgumentException ignorado) {
            }
        }
        return resultado;
    }

    public List<Integer> idsPorMaterial(Material material) {
        List<Integer> ids = new ArrayList<>();
        for (Document doc : colecao().find(Filters.eq("materiais", material.name()))) {
            ids.add(doc.getInteger("_id"));
        }
        return ids;
    }

    public void apagar(int impressoraId) {
        colecao().deleteOne(Filters.eq("_id", impressoraId));
    }

    public void apagarVarias(Collection<Integer> impressoraIds) {
        if (!impressoraIds.isEmpty()) {
            colecao().deleteMany(Filters.in("_id", impressoraIds));
        }
    }
}