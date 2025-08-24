import fitz
import os
import re
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class DocumentChunk:
    content: str
    metadata: Dict[str, Any]
    page_number: int
    source_file: str

class PDFProcessor:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def extract_text_from_pdf(self, pdf_path: str) -> List[DocumentChunk]:
        """Extract text from PDF and return chunks with metadata."""
        chunks = []

        try:
            doc = fitz.open(pdf_path)
            filename = os.path.basename(pdf_path)

            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text = page.get_text()

                if text.strip():
                    cleaned_text = self._clean_text(text)
                    page_chunks = self._create_chunks(cleaned_text, page_num + 1, filename)
                    chunks.extend(page_chunks)

            doc.close()
            return chunks

        except Exception as e:
            raise Exception(f"Error processing PDF {pdf_path}: {str(e)}")

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text."""
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'[^\w\s.,!?;:()\[\]{}"-]', '', text)
        text = re.sub(r'([.,!?;:]){2,}', r'\1', text)

        return text.strip()

    def _create_chunks(self, text: str, page_number: int, filename: str) -> List[DocumentChunk]:
        """Split text into overlapping chunks."""
        chunks = []
        sentences = re.split(r'(?<=[.!?])\s+', text)
        current_chunk = ""
        current_length = 0

        for sentence in sentences:
            sentence_length = len(sentence)

            if current_length + sentence_length > self.chunk_size and current_chunk:
                chunks.append(DocumentChunk(
                    content=current_chunk.strip(),
                    metadata={
                        'filename': filename,
                        'page_number': page_number,
                        'chunk_length': len(current_chunk)
                    },
                    page_number=page_number,
                    source_file=filename
                ))

                overlap_text = self._get_overlap_text(current_chunk)
                current_chunk = overlap_text + " " + sentence
                current_length = len(current_chunk)
            else:
                current_chunk += " " + sentence if current_chunk else sentence
                current_length = len(current_chunk)


        if current_chunk.strip():
            chunks.append(DocumentChunk(
                content=current_chunk.strip(),
                metadata={
                    'filename': filename,
                    'page_number': page_number,
                    'chunk_length': len(current_chunk)
                },
                page_number=page_number,
                source_file=filename
            ))

        return chunks

    def _get_overlap_text(self, text: str) -> str:
        """Get overlap text from the end of current chunk."""
        if len(text) <= self.chunk_overlap:
            return text
        return text[-self.chunk_overlap:]
