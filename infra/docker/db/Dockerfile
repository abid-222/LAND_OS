FROM postgis/postgis:16-3.4

LABEL maintainer="Bangladesh LandOS Engineering <core@landos.gov.bd>"
LABEL description="PostgreSQL 16 with PostGIS 3.4 and pgvector extensions"

# Install pgvector for Postgres 16
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-16-pgvector \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY init.sql /docker-entrypoint-initdb.d/00_init_extensions.sql
