-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a function to calculate cosine similarity
CREATE OR REPLACE FUNCTION cosine_similarity(a vector, b vector) RETURNS float AS $$
BEGIN
    RETURN 1 - (a <=> b);
END;
$$ LANGUAGE plpgsql;

-- Create an index for vector similarity search
CREATE INDEX IF NOT EXISTS vector_embedding_embedding_idx ON "VectorEmbedding" 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create a function for semantic search
CREATE OR REPLACE FUNCTION search_embeddings(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id text,
    content text,
    metadata jsonb,
    type text,
    similarity float
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ve.id,
        ve.content,
        ve.metadata,
        ve.type::text,
        cosine_similarity(ve.embedding, query_embedding) as similarity
    FROM "VectorEmbedding" ve
    WHERE cosine_similarity(ve.embedding, query_embedding) > match_threshold
    ORDER BY ve.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;