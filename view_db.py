import sqlite3
import json

conn = sqlite3.connect('floorsense.sqlite')
cursor = conn.cursor()

print("--- Event Logs ---")
cursor.execute("SELECT id, timestamp, source, tag_ref, new_value, actor FROM event_logs ORDER BY id DESC LIMIT 30")
for row in cursor.fetchall():
    print(row)

print("\n--- Test Plans ---")
cursor.execute("SELECT id, name, last_run_at, pass_fail, results FROM test_plans")
for row in cursor.fetchall():
    print(row[0], row[1], row[2], row[3])
    if row[4]:
        try:
            results = json.loads(row[4])
            for res in results:
                print(f"  Step {res['stepNumber']}: {res['name']} -> {res['status']} ({res.get('error', '')})")
        except Exception as e:
            print("  Error parsing results:", e)

conn.close()
