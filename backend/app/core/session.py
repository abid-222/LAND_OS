import time
from typing import Dict, Set

# In-memory session tracking and lockout registry (production fallback to Redis)
_ACTIVE_REFRESH_JTIS: Dict[str, str] = {}
_REVOKED_JTIS: Set[str] = set()
_LOGIN_FAILURES: Dict[str, list[float]] = {}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 900  # 15 minutes


def record_active_refresh_jti(user_id: str, jti: str):
    """Stores active refresh token JTI for a user."""
    _ACTIVE_REFRESH_JTIS[str(user_id)] = jti


def validate_refresh_jti(user_id: str, jti: str) -> bool:
    """
    Validates refresh token JTI.
    Detects reuse: if JTI is revoked or does not match active JTI, detects token reuse,
    revokes the session family, and returns False.
    """
    uid = str(user_id)
    if jti in _REVOKED_JTIS:
        # Token reuse detected! Invalidate all tokens for this user
        _ACTIVE_REFRESH_JTIS.pop(uid, None)
        return False

    active_jti = _ACTIVE_REFRESH_JTIS.get(uid)
    if active_jti and active_jti != jti:
        # Stale token presented, possible replay attack
        _REVOKED_JTIS.add(jti)
        _ACTIVE_REFRESH_JTIS.pop(uid, None)
        return False

    return True


def rotate_refresh_jti(user_id: str, old_jti: str, new_jti: str):
    """Rotates refresh token JTI, revoking old JTI."""
    uid = str(user_id)
    _REVOKED_JTIS.add(old_jti)
    _ACTIVE_REFRESH_JTIS[uid] = new_jti


def revoke_user_refresh_tokens(user_id: str, jti: str | None = None):
    """Revokes active refresh token on logout."""
    uid = str(user_id)
    active = _ACTIVE_REFRESH_JTIS.pop(uid, None)
    if active:
        _REVOKED_JTIS.add(active)
    if jti:
        _REVOKED_JTIS.add(jti)


def _get_redis():
    try:
        import redis

        from app.core.config import settings

        r = redis.Redis.from_url(
            settings.REDIS_URL,
            socket_connect_timeout=0.2,
            socket_timeout=0.2,
            decode_responses=True,
        )
        r.ping()
        return r
    except Exception:
        return None


def record_failed_login(email: str) -> int:
    """Records failed attempt timestamp. Returns current failed attempts in window."""
    now = time.time()
    clean_email = email.lower().strip()

    # Redis attempt recording
    r = _get_redis()
    if r is not None:
        try:
            key = f"landos:lockout:{clean_email}"
            val = r.incr(key)
            if val == 1:
                r.expire(key, LOCKOUT_DURATION_SECONDS)
        except Exception:
            pass

    attempts = _LOGIN_FAILURES.get(clean_email, [])
    # Filter attempts within lockout window
    recent = [t for t in attempts if now - t < LOCKOUT_DURATION_SECONDS]
    recent.append(now)
    _LOGIN_FAILURES[clean_email] = recent
    return len(recent)


def is_account_locked(email: str) -> bool:
    """Checks if account is locked due to excessive failed attempts."""
    clean_email = email.lower().strip()

    # Check Redis first
    r = _get_redis()
    if r is not None:
        try:
            key = f"landos:lockout:{clean_email}"
            val = r.get(key)
            if val and int(val) >= MAX_FAILED_ATTEMPTS:
                return True
        except Exception:
            pass

    now = time.time()
    attempts = _LOGIN_FAILURES.get(clean_email, [])
    recent = [t for t in attempts if now - t < LOCKOUT_DURATION_SECONDS]
    _LOGIN_FAILURES[clean_email] = recent
    return len(recent) >= MAX_FAILED_ATTEMPTS


def clear_failed_logins(email: str):
    """Resets failed login attempts upon successful login."""
    clean_email = email.lower().strip()
    r = _get_redis()
    if r is not None:
        try:
            key = f"landos:lockout:{clean_email}"
            r.delete(key)
        except Exception:
            pass
    _LOGIN_FAILURES.pop(clean_email, None)
