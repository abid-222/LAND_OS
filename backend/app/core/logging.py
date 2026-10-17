import logging
import re
import sys

from pythonjsonlogger import jsonlogger

# Regular expressions for scrubbing PII and sensitive tokens from log streams
TOKEN_PATTERN = re.compile(r"(Bearer\s+)[A-Za-z0-9._-]+", re.IGNORECASE)
PASSWORD_PATTERN = re.compile(
    r"(?:password|secret|access_token|refresh_token)\s*[:=]\s*[^\s,]+", re.IGNORECASE
)
PHONE_PATTERN = re.compile(r"\b01[3-9]\d{8}\b")
NID_PATTERN = re.compile(r"\b(?:\d{10}|\d{13}|\d{17})\b")


class PIIScrubFilter(logging.Filter):
    """
    Scrubs tokens, passwords, phone numbers, and NID numbers from log records (Requirement 2.5).
    """

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = self.scrub(record.msg)
        if record.args and isinstance(record.args, dict):
            record.args = {k: self.scrub(str(v)) for k, v in record.args.items()}
        elif record.args and isinstance(record.args, tuple):
            record.args = tuple(self.scrub(str(a)) for a in record.args)
        return True

    @staticmethod
    def scrub(text: str) -> str:
        if not isinstance(text, str):
            return text
        text = TOKEN_PATTERN.sub(r"\1[REDACTED_TOKEN]", text)
        text = PASSWORD_PATTERN.sub(r'"password": "[REDACTED_SECRET]"', text)
        text = PHONE_PATTERN.sub("[REDACTED_PHONE]", text)
        text = NID_PATTERN.sub("[REDACTED_NID]", text)
        return text


def setup_logging(log_level: str = "INFO"):
    logger = logging.getLogger()
    logger.setLevel(log_level)

    # Clear existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)

    log_handler = logging.StreamHandler(sys.stdout)
    log_handler.addFilter(PIIScrubFilter())
    formatter = jsonlogger.JsonFormatter(
        "%(asctime)s %(levelname)s %(name)s %(module)s %(funcName)s %(lineno)d %(message)s"
    )
    log_handler.setFormatter(formatter)
    logger.addHandler(log_handler)

    # Suppress verbose noisy loggers in dev
    logging.getLogger("uvicorn.access").handlers = [log_handler]
    logging.getLogger("uvicorn.error").handlers = [log_handler]

    return logger
