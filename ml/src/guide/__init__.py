"""
Guide Retrieval & Knowledge Base Search Package.
Implements multilingual-e5-base embedding, passage vs query formatting,
cosine thresholding, and optional grounded LLM rephraser with strict anti-hallucination post-check.
"""

from ml.src.guide.retriever import GuideRetriever, RetrievalResult, get_guide_retriever
from ml.src.guide.llm import generate_grounded_answer, verify_passage_grounding
