import faiss
import numpy as np
import pickle
import os
from typing import List, Dict, Any, Tuple
from sentence_transformers import SentenceTransformer
from pdf_processor import DocumentChunk

class VectorStore:
    def __init__(self, model_name: str, vector_db_path: str):
        self.model = SentenceTransformer(model_name)
        self.vector_db_path = vector_db_path
        self.index_path = os.path.join(vector_db_path, 'faiss_index.bin')
        self.metadata_path = os.path.join(vector_db_path, 'metadata.pkl')

        self.index = None
        self.metadata = []
        self.load_index()

    def load_index(self):
        """Load existing FAISS index and metadata."""
        try:
            if os.path.exists(self.index_path) and os.path.exists(self.metadata_path):
                self.index = faiss.read_index(self.index_path)
                with open(self.metadata_path, 'rb') as f:
                    self.metadata = pickle.load(f)

                print(f"Loaded existing index with {len(self.metadata)} documents")
            else:
                print("No existing index found. Will create new one.")
        except Exception as e:
            print(f"Error loading index: {e}")
            self.index = None
            self.metadata = []

    def add_documents(self, chunks: List[DocumentChunk]):
        """Add document chunks to the vector store."""
        if not chunks:
            return

        texts = [chunk.content for chunk in chunks]
        embeddings = self.model.encode(texts, convert_to_tensor=False)
        embeddings = np.array(embeddings).astype('float32')

        if self.index is None:
            dimension = embeddings.shape[1]
            self.index = faiss.IndexFlatIP(dimension)
            faiss.normalize_L2(embeddings)

        self.index.add(embeddings) # type: ignore


        for chunk in chunks:
            self.metadata.append({
                'content': chunk.content,
                'metadata': chunk.metadata,
                'page_number': chunk.page_number,
                'source_file': chunk.source_file
            })


        self.save_index()
        print(f"Added {len(chunks)} chunks to vector store")

    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search for similar documents."""
        if self.index is None or len(self.metadata) == 0:
            return []

        query_embedding = self.model.encode([query], convert_to_tensor=False)
        query_embedding = np.array(query_embedding).astype('float32')
        faiss.normalize_L2(query_embedding)
        scores, indices = self.index.search(query_embedding, min(top_k, len(self.metadata))) # type: ignore
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx != -1:
                result = self.metadata[idx].copy()
                result['similarity_score'] = float(score)
                results.append(result)

        return results

    def save_index(self):
        """Save FAISS index and metadata to disk."""
        try:
            if self.index is not None:
                faiss.write_index(self.index, self.index_path)

            with open(self.metadata_path, 'wb') as f:
                pickle.dump(self.metadata, f)

        except Exception as e:
            print(f"Error saving index: {e}")

    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the vector store."""
        if self.index is None:
            return {'total_documents': 0, 'index_size': 0}

        return {
            'total_documents': len(self.metadata),
            'index_size': self.index.ntotal,
            'dimension': self.index.d
        }

    def clear_index(self):
        """Clear the entire index."""
        self.index = None
        self.metadata = []
        if os.path.exists(self.index_path):
            os.remove(self.index_path)
        if os.path.exists(self.metadata_path):
            os.remove(self.metadata_path)

        print("Index cleared successfully")
