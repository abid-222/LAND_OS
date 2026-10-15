"""
Multilingual E5 Knowledge Base Guide Retriever for Bangladesh LandOS.
Model: intfloat/multilingual-e5-base (768-dimensional)
- Embed passages with prefix "passage: "
- Embed queries with prefix "query: "
- Cosine distance matching via pgvector or numpy
- Threshold tuned on labeled question set; below threshold -> needs_verification
"""

from dataclasses import dataclass
import hashlib
import logging
import os
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

logger = logging.getLogger("landos.guide.retriever")

DEFAULT_MODEL_NAME = "intfloat/multilingual-e5-base"
DEFAULT_SIMILARITY_THRESHOLD = 0.78


@dataclass
class RetrievalCandidate:
    article_id: str
    title: str
    content: str
    source: str
    similarity_score: float


@dataclass
class RetrievalResult:
    status: str  # "verified_source" | "needs_verification"
    best_candidate: Optional[RetrievalCandidate]
    top_candidates: List[RetrievalCandidate]
    threshold_applied: float
    confidence: float


class GuideRetriever:
    def __init__(self, model_name: str = DEFAULT_MODEL_NAME, threshold: float = DEFAULT_SIMILARITY_THRESHOLD):
        self.model_name = model_name
        self.threshold = float(os.getenv("GUIDE_SIMILARITY_THRESHOLD", threshold))
        self._model = None
        self._use_fallback = False

    def _get_model(self):
        if os.getenv("GUIDE_RETRIEVER_OFFLINE", "1").lower() in ("true", "1", "yes"):
            self._use_fallback = True
            return None

        if self._model is None and not self._use_fallback:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Loading SentenceTransformer: {self.model_name}...")
                self._model = SentenceTransformer(self.model_name)
            except Exception as e:
                logger.warning(
                    f"Could not load online weights for {self.model_name}: {e}. Operating in deterministic semantic hash fallback mode."
                )
                self._use_fallback = True
        return self._model

    def embed_passage(self, text: str) -> np.ndarray:
        """Embeds an official land article passage with 'passage: ' prefix."""
        formatted = f"passage: {text.strip()}"
        return self._encode_text(formatted)

    def embed_query(self, query: str) -> np.ndarray:
        """Embeds a citizen land inquiry with 'query: ' prefix."""
        formatted = f"query: {query.strip()}"
        return self._encode_text(formatted)

    def _encode_text(self, text: str) -> np.ndarray:
        model = self._get_model()
        if model is not None:
            emb = model.encode(text, normalize_embeddings=True)
            return np.array(emb, dtype=np.float32)

        # Fallback 768-dimensional deterministic semantic embedding
        return self._fallback_embedding(text)

    def _fallback_embedding(self, text: str) -> np.ndarray:
        """Deterministic 768-d unit vector based on token hashed frequencies."""
        vec = np.zeros(768, dtype=np.float32)
        words = text.lower().split()
        for w in words:
            h = int(hashlib.md5(w.encode("utf-8")).hexdigest(), 16)
            idx = h % 768
            sign = 1.0 if (h % 2 == 0) else -1.0
            vec[idx] += sign * (1.0 + (len(w) / 10.0))

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec /= norm
        return vec

    def compute_similarity(self, query_emb: np.ndarray, doc_emb: np.ndarray) -> float:
        """Cosine similarity between two unit-normalized embeddings."""
        dot = float(np.dot(query_emb, doc_emb))
        return max(0.0, min(1.0, dot))

    def retrieve(
        self,
        query: str,
        articles: List[Dict[str, Any]],
        threshold: Optional[float] = None,
        top_k: int = 3,
    ) -> RetrievalResult:
        """
        Retrieves top-matching knowledge base articles for a query.
        If highest similarity < threshold, status returns 'needs_verification'.
        """
        if not articles:
            return RetrievalResult(
                status="needs_verification",
                best_candidate=None,
                top_candidates=[],
                threshold_applied=threshold or self.threshold,
                confidence=0.0,
            )

        thresh = threshold if threshold is not None else self.threshold
        query_emb = self.embed_query(query)

        scored_candidates: List[RetrievalCandidate] = []
        for art in articles:
            art_id = str(art.get("id", ""))
            title = str(art.get("title", ""))
            content = str(art.get("content", ""))
            source = str(art.get("source", ""))

            # Use precomputed embedding if available
            doc_emb = art.get("embedding")
            if doc_emb is None:
                doc_emb = self.embed_passage(f"{title}\n{content}")
            else:
                doc_emb = np.array(doc_emb, dtype=np.float32)
                norm = np.linalg.norm(doc_emb)
                if norm > 0:
                    doc_emb = doc_emb / norm

            score = self.compute_similarity(query_emb, doc_emb)
            scored_candidates.append(
                RetrievalCandidate(
                    article_id=art_id,
                    title=title,
                    content=content,
                    source=source,
                    similarity_score=round(score, 4),
                )
            )

        scored_candidates.sort(key=lambda x: x.similarity_score, reverse=True)
        top_candidates = scored_candidates[:top_k]

        best = top_candidates[0] if top_candidates else None
        best_score = best.similarity_score if best else 0.0

        if best and best_score >= thresh:
            status = "verified_source"
        else:
            status = "needs_verification"

        return RetrievalResult(
            status=status,
            best_candidate=best,
            top_candidates=top_candidates,
            threshold_applied=thresh,
            confidence=best_score,
        )

    def tune_threshold(
        self,
        labeled_questions: List[Dict[str, Any]],
        articles: List[Dict[str, Any]],
        min_threshold: float = 0.65,
        max_threshold: float = 0.90,
        step: float = 0.02,
    ) -> float:
        """
        Calibrates optimal cosine threshold on a small labeled question set.
        Balances precision (rejecting ungrounded questions) with recall (retrieving valid articles).
        """
        best_f1 = -1.0
        best_t = self.threshold

        thresholds = np.arange(min_threshold, max_threshold + 0.001, step)
        for t in thresholds:
            tp, fp, fn = 0, 0, 0
            for item in labeled_questions:
                q = item["query"]
                has_answer = item["is_groundable"]
                exp_article = item.get("expected_article_id")

                res = self.retrieve(q, articles, threshold=t)
                retrieved_pass = (res.status == "verified_source")

                if has_answer and retrieved_pass:
                    if exp_article is None or (res.best_candidate and res.best_candidate.article_id == exp_article):
                        tp += 1
                    else:
                        fp += 1
                elif not has_answer and retrieved_pass:
                    fp += 1
                elif has_answer and not retrieved_pass:
                    fn += 1

            precision = tp / max(1, tp + fp)
            recall = tp / max(1, tp + fn)
            f1 = 2 * (precision * recall) / max(1e-6, precision + recall)

            if f1 > best_f1:
                best_f1 = f1
                best_t = float(t)

        self.threshold = round(best_t, 2)
        return self.threshold


_global_retriever: Optional[GuideRetriever] = None


def get_guide_retriever() -> GuideRetriever:
    global _global_retriever
    if _global_retriever is None:
        _global_retriever = GuideRetriever()
    return _global_retriever
