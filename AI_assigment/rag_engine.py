import google.generativeai as genai
from typing import List, Dict, Any
from vector_store import VectorStore
from config import Config

class RAGEngine:
    def __init__(self, vector_store: VectorStore):
        self.vector_store = vector_store

        genai.configure(api_key=Config.GEMINI_API_KEY) # type: ignore
        self.model = genai.GenerativeModel('gemini-2.0-flash-lite') # type: ignore

    def generate_answer(self, query: str, top_k: int = 5) -> Dict[str, Any]:
        """Generate answer using RAG pipeline."""
        try:

            search_results = self.vector_store.search(query, top_k)

            if not search_results:
                return {
                    'answer': "I couldn't find any relevant information in the uploaded documents to answer your question.",
                    'sources': [],
                    'context_used': ""
                }


            context_parts = []
            sources = []

            for i, result in enumerate(search_results):
                context_parts.append(f"[Context {i+1}]: {result['content']}")
                sources.append({
                    'source_file': result['source_file'],
                    'page_number': result['page_number'],
                    'similarity_score': result['similarity_score'],
                    'content_preview': result['content'][:200] + "..." if len(result['content']) > 200 else result['content']
                })

            context = "\n\n".join(context_parts)
            prompt = self._create_prompt(query, context)
            response = self.model.generate_content(prompt)

            return {
                'answer': response.text,
                'sources': sources,
                'context_used': context,
                'query': query
            }

        except Exception as e:
            return {
                'answer': f"An error occurred while generating the answer: {str(e)}",
                'sources': [],
                'context_used': "",
                'error': str(e)
            }

    def _create_prompt(self, query: str, context: str) -> str:
        """Create a prompt for the language model."""
        prompt = f"""You are an AI assistant that answers questions based on provided document context.
                    Instructions:
                    1. Answer the question using ONLY the information provided in the context below
                    2. If the context doesn't contain enough information to answer the question, say so clearly
                    3. Be concise but comprehensive in your answer
                    4. If you reference specific information, mention which context section it comes from
                    5. Do not make up information that's not in the provided context
                    Context from documents:
                    {context}
                    Question: {query}
                    Answer:"""

        return prompt

    def get_conversation_response(self, query: str) -> str:
        """Get a simple text response for conversation interface."""
        result = self.generate_answer(query)

        answer = result['answer']
        sources = result.get('sources', [])

        if sources:
            answer += "\n\n**Sources:**\n"
            for i, source in enumerate(sources[:3], 1):
                answer += f"{i}. {source['source_file']} (Page {source['page_number']})\n"

        return answer
