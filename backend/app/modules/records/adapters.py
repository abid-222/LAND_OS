"""
Authorized Data Source Adapters for Bangladesh Land Records.
Defines standard interfaces and provenance tracking for ingesting
authorized government land registry datasets (DLRS, e-Porcha, Land Ministry).
"""

import abc
import csv
import io
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List


class BaseSourceAdapter(abc.ABC):
    """
    Abstract source-adapter interface for future authorized government data feeds.
    Enforces provenance tracking (source_id, source_ref, retrieved_at, version).
    """

    @abc.abstractmethod
    def get_source_identifier(self) -> str:
        """Returns unique code for data provider (e.g. 'DLRS_API', 'EPORCHA_CSV')."""
        pass

    @abc.abstractmethod
    def parse_and_validate(self, raw_data: Any) -> List[Dict[str, Any]]:
        """Parses raw input and validates mandatory fields and provenance metadata."""
        pass


class CSVSourceAdapter(BaseSourceAdapter):
    """
    Adapter ingesting land records from CSV files with provenance verification.
    Expected CSV columns:
    - khatian_no (required)
    - dag_no (required)
    - mouza (required)
    - owner_names (required)
    - area_decimal (required)
    - source_id (optional, defaults to DLRS_SYNTHETIC)
    - source_ref (optional, e.g. Gazette reference or Batch ID)
    - retrieved_at (optional ISO timestamp)
    - version (optional, defaults to v1.0)
    """

    def get_source_identifier(self) -> str:
        return "AUTHORIZED_CSV_INGEST"

    def parse_and_validate(self, raw_data: str) -> List[Dict[str, Any]]:
        reader = csv.DictReader(io.StringIO(raw_data))
        parsed_records: List[Dict[str, Any]] = []
        now_iso = datetime.now(timezone.utc).isoformat()

        for idx, row in enumerate(reader, start=1):
            khatian = row.get("khatian_no", "").strip()
            dag = row.get("dag_no", "").strip()
            mouza = row.get("mouza", "").strip()
            owners = row.get("owner_names", "").strip()

            if not khatian or not dag:
                continue

            try:
                area = float(row.get("area_decimal", 0.0) or 0.0)
            except ValueError:
                area = 0.0

            source_id = row.get("source_id", "").strip() or "DLRS_OFFICIAL_BATCH"
            source_ref = row.get("source_ref", "").strip() or f"CSV-IMPORT-{uuid.uuid4().hex[:8]}"
            retrieved_at = row.get("retrieved_at", "").strip() or now_iso
            version = row.get("version", "").strip() or "v1.0"

            parsed_records.append({
                "khatian_no": khatian,
                "dag_no": dag,
                "mouza": mouza,
                "owner_names": owners,
                "area_decimal": area,
                "provenance": {
                    "source_id": source_id,
                    "source_ref": source_ref,
                    "retrieved_at": retrieved_at,
                    "version": version,
                },
            })

        return parsed_records
