package aacd.storage;

import com.mongodb.MongoException;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.gridfs.GridFSBucket;
import com.mongodb.client.gridfs.GridFSBuckets;
import com.mongodb.client.gridfs.model.GridFSUploadOptions;
import com.mongodb.client.model.Filters;
import org.bson.Document;
import org.bson.types.ObjectId;

import java.io.InputStream;
import java.util.Date;

public class ArmazenamentoGridFs implements ArmazenamentoArquivo {
    private static final String NOME_BUCKET = "modelos3d";

    private final GridFSBucket bucket;

    public ArmazenamentoGridFs(MongoDatabase database) {
        this.bucket = GridFSBuckets.create(database, NOME_BUCKET);
    }

    @Override
    public String salvar(String nomeArquivo, InputStream conteudo) throws ArmazenamentoException {
        GridFSUploadOptions opcoes = new GridFSUploadOptions()
                .metadata(new Document("nomeOriginal", nomeArquivo)
                        .append("dataEnvio", new Date()));
        try {
            ObjectId id = bucket.uploadFromStream(nomeArquivo, conteudo, opcoes);
            return id.toHexString();
        } catch (MongoException e) {
            throw new ArmazenamentoException("Falha ao salvar o arquivo", e);
        }
    }

    @Override
    public InputStream abrir(String arquivoId) throws ArmazenamentoException {
        ObjectId id = converter(arquivoId);
        try {
            if (!existe(id)) {
                throw new ArquivoNaoEncontradoException(arquivoId);
            }
            return bucket.openDownloadStream(id);
        } catch (MongoException e) {
            throw new ArmazenamentoException("Falha ao abrir o arquivo", e);
        }
    }

    @Override
    public void apagar(String arquivoId) throws ArmazenamentoException {
        ObjectId id;
        try {
            id = converter(arquivoId);
        } catch (ArquivoNaoEncontradoException e) {
            return;
        }
        try {
            if (existe(id)) {
                bucket.delete(id);
            }
        } catch (MongoException e) {
            throw new ArmazenamentoException("Falha ao apagar o arquivo", e);
        }
    }

    private ObjectId converter(String arquivoId) throws ArquivoNaoEncontradoException {
        if (arquivoId == null || !ObjectId.isValid(arquivoId)) {
            throw new ArquivoNaoEncontradoException(arquivoId);
        }
        return new ObjectId(arquivoId);
    }

    private boolean existe(ObjectId id) {
        return bucket.find(Filters.eq("_id", id)).first() != null;
    }
}