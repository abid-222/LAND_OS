# Bangladesh LandOS — Backup and Disaster Recovery Runbook

**Document Version**: 1.0.0  
**Target Environment**: Production / Staging  
**Storage Target**: Offsite encrypted object storage / Local disk (`/backups`)  
**Audit Standard**: ISO/IEC 27001 & Bangladesh National Data Center Compliance  

---

## 1. Backup Architecture & Strategy

The Bangladesh LandOS backup pipeline operates on a daily automated cadence, ensuring Recovery Point Objective (RPO) $\le 24$ hours and Recovery Time Objective (RTO) $\le 15$ minutes.

### Components Backed Up:
1. **Relational Database**:
   - PostgreSQL schema, spatial parcel geometries (`PostGIS`), full audit logs, extracted document fields, and normalized land records.
2. **Document Object Store (MinIO)**:
   - High-resolution deed document scans, PDF certificates, and extracted crop thumbnails.
3. **Machine Learning Artifacts & Configuration**:
   - `models/match_v1.joblib` (RandomForest multi-feature candidate ranker).
   - Authoritative Knowledge Base articles (`data/kb/`).
4. **Cryptographic Manifest**:
   - Timestamped `manifest.json` containing SHA-256 hashes of every individual asset.
   - Archive-level `.sha256` sidecar checksum for end-to-end transport verification.

---

## 2. Nightly Backup Procedure

The automated backup job is executed via cron or task scheduler calling:

```bash
python scripts/nightly_backup.py --out backups
```

### Automation Cron Entry (Production):
```cron
# Run nightly at 02:00 UTC (08:00 AM BST)
0 2 * * * /usr/bin/python3 /opt/landos/scripts/nightly_backup.py --out /mnt/secure_backups/ >> /var/log/landos_backup.log 2>&1
```

### Execution Output:
- Archive: `backups/landos_backup_YYYYMMDD_HHMMSS.tar.gz`
- Checksum: `backups/landos_backup_YYYYMMDD_HHMMSS.tar.gz.sha256`
- Retention: Retain 7 daily backups, 4 weekly backups, and 12 monthly archives.

---

## 3. Disaster Recovery & Restoration Verification Test

To verify that backup archives are valid, uncorrupted, and capable of restoring state without data loss, run the automated restore test:

```bash
# Test latest backup automatically
python scripts/test_restore.py

# Or test a specific archive
python scripts/test_restore.py --archive backups/landos_backup_20261015_163250.tar.gz
```

### Test Validation Steps:
1. **Archive Checksum Verification**: Validates the `.sha256` sidecar against the archive binary.
2. **Quarantine Sandbox Extraction**: Unpacks into an isolated temporary directory.
3. **Manifest Cryptographic Signature Check**: Validates each asset against the stored hash in `manifest.json`.
4. **Database & Record Verification**: Validates table rows, active land record counts, and epistemic badge labels (`VERIFIED_AUTHORIZED_SOURCE`, `POSSIBLE_MATCH`, etc.).
5. **Knowledge Base Integrity**: Validates the presence and readability of all 12 legal knowledge base articles.

### Test Result Status:
```
=================================================================
DISASTER RECOVERY RESTORE TEST RESULT: PASSED (100% INTEGRITY)
=================================================================
```
