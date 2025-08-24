import gradio as gr
import os
import uuid
import tempfile
from typing import List, Tuple, Optional
from config import Config
from pdf_processor import PDFProcessor
from vector_store import VectorStore
from rag_engine import RAGEngine

# Initialize components
pdf_processor = PDFProcessor(
    chunk_size=Config.CHUNK_SIZE,
    chunk_overlap=Config.CHUNK_OVERLAP
)

vector_store = VectorStore(
    model_name=Config.EMBEDDING_MODEL,
    vector_db_path=Config.VECTOR_DB_PATH
)

rag_engine = RAGEngine(vector_store)

def upload_and_process_pdfs(files: List[tempfile._TemporaryFileWrapper]) -> str:
    """Process uploaded PDF files and add them to the vector store."""
    if not files:
        return "❌ No files uploaded."

    try:
        uploaded_files = []
        total_chunks = 0

        for file in files:
            if file is None:
                continue

            file_path = file.name
            filename = os.path.basename(file_path)

            # Check if it's a PDF
            if not filename.lower().endswith('.pdf'):
                continue

            # Process PDF
            chunks = pdf_processor.extract_text_from_pdf(file_path)

            # Add to vector store
            vector_store.add_documents(chunks)

            uploaded_files.append(filename)
            total_chunks += len(chunks)

        if uploaded_files:
            stats = vector_store.get_stats()
            return f"✅ Successfully processed {len(uploaded_files)} PDF(s):\n" + \
                   f"📄 Files: {', '.join(uploaded_files)}\n" + \
                   f"📊 Total chunks created: {total_chunks}\n" + \
                   f"🗃️ Database now contains {stats['total_documents']} total documents"
        else:
            return "❌ No valid PDF files found."

    except Exception as e:
        return f"❌ Error processing files: {str(e)}"

def get_database_stats() -> str:
    """Get current database statistics."""
    stats = vector_store.get_stats()
    return f"📊 **Database Statistics**\n\n" + \
           f"📄 Total Documents: {stats['total_documents']}\n" + \
           f"🔍 Index Size: {stats['index_size']}\n" + \
           f"📏 Vector Dimension: {stats.get('dimension', 'N/A')}"

def clear_database() -> str:
    """Clear the entire vector database."""
    try:
        vector_store.clear_index()
        return "✅ Database cleared successfully!"
    except Exception as e:
        return f"❌ Error clearing database: {str(e)}"

def respond(message: str, chat_history: List[dict]) -> Tuple[str, List[dict]]:
    """Chat function that handles the new messages format."""
    if not message.strip():
        return "", chat_history

    try:
        # Get response from RAG engine
        result = rag_engine.generate_answer(message, top_k=Config.TOP_K)

        response = result['answer']
        sources = result.get('sources', [])

        # Add source information to response
        if sources:
            response += "\n\n**📚 Sources:**\n"
            for i, source in enumerate(sources[:3], 1):
                response += f"{i}. 📄 **{source['source_file']}** (Page {source['page_number']})\n"
                response += f"   📝 _{source['content_preview']}_\n"

        # Add user message to chat history
        chat_history.append({"role": "user", "content": message})

        # Add assistant response to chat history
        chat_history.append({"role": "assistant", "content": response})

        return "", chat_history

    except Exception as e:
        error_response = f"❌ Error: {str(e)}"

        # Add user message and error response to chat history
        chat_history.append({"role": "user", "content": message})
        chat_history.append({"role": "assistant", "content": error_response})

        return "", chat_history

def create_interface():
    """Create the Gradio interface."""

    with gr.Blocks(title="PDF RAG System") as interface:

        # Header
        gr.Markdown("# 🤖 PDF RAG Assistant")
        gr.Markdown("Upload PDFs and ask intelligent questions about their content using AI")

        with gr.Tabs():

            # Tab 1: Document Management
            with gr.Tab("📁 Document Management"):

                with gr.Row():
                    with gr.Column(scale=2):
                        gr.Markdown("## 📤 Upload PDF Documents")
                        gr.Markdown("Drag and drop your PDF files or click to browse")

                        file_upload = gr.File(
                            file_count="multiple",
                            file_types=[".pdf"],
                            label="Select PDF files to upload"
                        )

                        upload_btn = gr.Button(
                            "🚀 Process PDFs",
                            variant="primary",
                            size="lg"
                        )

                        upload_status = gr.Textbox(
                            label="📊 Upload Status",
                            interactive=False,
                            max_lines=8
                        )

                    with gr.Column(scale=1):
                        gr.Markdown("## 🗄️ Database Management")

                        stats_display = gr.Markdown(get_database_stats())

                        with gr.Row():
                            refresh_btn = gr.Button("🔄 Refresh", size="sm", variant="secondary")
                            clear_btn = gr.Button("🗑️ Clear Database", size="sm", variant="stop")

                        clear_status = gr.Textbox(
                            label="🔧 Database Status",
                            interactive=False,
                            max_lines=3
                        )

                # Event handlers for document management
                def update_stats_display():
                    return get_database_stats()

                upload_btn.click(
                    fn=upload_and_process_pdfs,
                    inputs=[file_upload],
                    outputs=[upload_status]
                ).then(
                    fn=update_stats_display,
                    outputs=[stats_display]
                )

                refresh_btn.click(
                    fn=update_stats_display,
                    outputs=[stats_display]
                )

                clear_btn.click(
                    fn=clear_database,
                    outputs=[clear_status]
                ).then(
                    fn=update_stats_display,
                    outputs=[stats_display]
                )

            # Tab 2: Chat Interface
            with gr.Tab("💬 AI Assistant"):

                gr.Markdown("## 🤖 Ask questions about your uploaded documents")
                gr.Markdown("**💡 Tips:** Upload PDFs first, then ask specific questions about their content for detailed answers with source references.")

                # Create chat interface with messages format
                chatbot = gr.Chatbot(
                    height=500,
                    show_label=False,
                    type="messages",
                    value=[{
                        "role": "assistant",
                        "content": "👋 **Welcome to PDF RAG Assistant!**\n\nI'm here to help you analyze and understand your PDF documents. \n\n📋 **Getting started:**\n1. Upload PDFs in the 'Document Management' tab\n2. Come back here and ask me questions\n3. I'll provide detailed answers with source references\n\n🚀 **Ready to get started?**"
                    }]
                )

                with gr.Row():
                    msg_input = gr.Textbox(
                        placeholder="💭 Ask a question about your documents...",
                        label="Your Question",
                        lines=2,
                        scale=4
                    )
                    send_btn = gr.Button(
                        "📨 Send",
                        variant="primary",
                        size="lg",
                        scale=1
                    )

                clear_chat_btn = gr.Button(
                    "🧹 Clear Chat",
                    variant="secondary",
                    size="sm"
                )

                # Event handlers for chat
                send_btn.click(
                    fn=respond,
                    inputs=[msg_input, chatbot],
                    outputs=[msg_input, chatbot]
                )

                msg_input.submit(
                    fn=respond,
                    inputs=[msg_input, chatbot],
                    outputs=[msg_input, chatbot]
                )

                clear_chat_btn.click(
                    fn=lambda: [{
                        "role": "assistant",
                        "content": "👋 **Welcome back!**\n\nI'm ready to help you with your PDF documents again. What would you like to know?"
                    }],
                    outputs=[chatbot]
                )

            # Tab 3: System Information
            with gr.Tab("ℹ️ System Information"):

                gr.Markdown("# ⚙️ System Configuration & Information")

                with gr.Row():
                    with gr.Column():
                        gr.Markdown("## 🔧 Current Settings")

                        settings_info = f"""
**🧠 Embedding Model:** `{Config.EMBEDDING_MODEL}`

**📝 Chunk Size:** {Config.CHUNK_SIZE} characters

**🔗 Chunk Overlap:** {Config.CHUNK_OVERLAP} characters

**🎯 Search Results:** Top {Config.TOP_K} most relevant chunks

**📁 Max File Size:** 16MB per PDF
"""
                        gr.Markdown(settings_info)

                    with gr.Column():
                        gr.Markdown("## 🚀 Key Features")

                        features_info = """
✅ Multiple PDF upload and processing

✅ Intelligent text chunking

✅ Vector similarity search using FAISS

✅ AI-powered Q&A with Google Gemini

✅ Source attribution with page numbers

✅ Persistent vector database storage

✅ Real-time chat interface

✅ Responsive modern UI
"""
                        gr.Markdown(features_info)

                gr.Markdown("## 🛠️ Technology Stack")

                with gr.Row():
                    with gr.Column():
                        gr.Markdown("**🖥️ Framework:** Gradio 4.44+")
                        gr.Markdown("**📄 PDF Processing:** PyMuPDF")
                    with gr.Column():
                        gr.Markdown("**🧮 Embeddings:** Sentence Transformers")
                        gr.Markdown("**🗃️ Vector Database:** FAISS")
                    with gr.Column():
                        gr.Markdown("**🤖 Language Model:** Google Gemini 1.5")

                gr.Markdown("## 📝 Quick Start Guide")

                guide_info = """
**1.** Upload Documents - Go to 'Document Management' tab and upload your PDF files

**2.** Process & Index - Wait for the system to extract text and create embeddings

**3.** Ask Questions - Switch to 'AI Assistant' tab and start asking questions

**4.** Get Intelligent Answers - Receive detailed responses with source references and page numbers
"""
                gr.Markdown(guide_info)

    return interface

if __name__ == "__main__":
    # Create and launch the interface
    interface = create_interface()
    interface.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False,
        show_error=True
    )
