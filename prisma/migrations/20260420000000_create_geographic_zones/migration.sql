-- Requires PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "ZoneType" AS ENUM ('TRANSPORTE', 'DEPOSITO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "geographic_zones" (
    "id"         UUID          NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"  UUID          NOT NULL,
    "project_id" UUID          NOT NULL,
    "zone_code"  VARCHAR(50)   NOT NULL,
    "name"       VARCHAR(255)  NOT NULL,
    "boundary"   geometry(MultiPolygon, 4326) NOT NULL,
    "type"       "ZoneType"    NOT NULL,
    "metadata"   JSONB         NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ   NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT "geographic_zones_pkey" PRIMARY KEY ("id")
);

-- UniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "geographic_zones_zone_code_key"
    ON "geographic_zones"("zone_code");

-- GiST index for spatial queries
CREATE INDEX IF NOT EXISTS "idx_geographic_zones_boundary"
    ON "geographic_zones" USING GIST ("boundary");

-- GIN index for metadata JSON queries
CREATE INDEX IF NOT EXISTS "idx_geographic_zones_metadata"
    ON "geographic_zones" USING GIN ("metadata");

-- Composite index for tenant/project filtering
CREATE INDEX IF NOT EXISTS "idx_geographic_zones_tenant_project"
    ON "geographic_zones"("tenant_id", "project_id");
