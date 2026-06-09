import json
import os
import sys
import psycopg2


def parse_env(path):
    env = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.normpath(os.path.join(script_dir, "..", "..", ".env"))

    if not os.path.exists(env_path):
        print(f"ERROR: .env not found at {env_path}")
        sys.exit(1)

    env = parse_env(env_path)

    db_user = env.get("DB_USERNAME", "")
    db_host = env.get("DB_HOST", "localhost")

    print(f"Connecting via {db_host}...")
    try:
        conn = psycopg2.connect(
            host=db_host,
            port=int(env.get("DB_PORT", 5432)),
            dbname=env.get("DB_DATABASE", "postgres"),
            user=db_user,
            password=env.get("DB_PASSWORD", ""),
            sslmode="require",
            connect_timeout=30,
            options="-c search_path=public,extensions",
        )
    except Exception as e:
        print(f"ERROR: Could not connect — {e}")
        sys.exit(1)

    cur = conn.cursor()

    geojson_path = os.path.join(script_dir, "lebanon_municipalities.geojson")
    print(f"Reading {geojson_path}...")
    with open(geojson_path, encoding="utf-8") as f:
        data = json.load(f)

    features = data.get("features", [])
    total = len(features)
    print(f"Found {total} municipalities.\n")

    cur.execute("DELETE FROM municipalities")
    print("Cleared existing rows.")

    inserted = 0
    skipped = 0
    for feature in features:
        props = feature.get("properties", {}) or {}
        name_en = props.get("name_en") or props.get("name") or ""
        name_ar = props.get("name_ar") or props.get("name") or ""
        osm_id = props.get("osm_id")
        try:
            osm_id = int(osm_id) if osm_id is not None else None
        except (ValueError, TypeError):
            osm_id = None

        geometry = feature.get("geometry")
        if not geometry:
            skipped += 1
            continue

        geometry_str = json.dumps(geometry)

        try:
            # ST_Multi wraps POLYGON → MULTIPOLYGON if needed
            cur.execute(
                """
                INSERT INTO municipalities (name_en, name_ar, osm_id, boundary, created_at, updated_at)
                VALUES (%s, %s, %s, ST_Multi(ST_GeomFromGeoJSON(%s)), NOW(), NOW())
                """,
                (name_en, name_ar, osm_id, geometry_str),
            )
            inserted += 1
        except Exception as e:
            conn.rollback()
            cur.execute("SET search_path TO public, extensions")
            print(f"  SKIP [{name_en}]: {e}")
            skipped += 1
            continue

        if inserted % 100 == 0:
            print(f"  Inserted {inserted}/{total}...")

    conn.commit()
    print(f"\nDone! Inserted {inserted} municipalities, skipped {skipped}.")

    cur.execute("SELECT COUNT(*) FROM municipalities")
    count = cur.fetchone()[0]
    print(f"Verified: {count} rows in municipalities table.")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
