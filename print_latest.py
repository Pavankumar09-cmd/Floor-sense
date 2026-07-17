import sqlite3
import json

conn = sqlite3.connect('floorsense.sqlite')
cursor = conn.cursor()

# Get the last run test plan results
cursor.execute("SELECT results, pass_fail, last_run_at FROM test_plans WHERE id='tp_demo1'")
row = cursor.fetchone()
if row:
    print(f"Status: {row[1]}, Last Run: {row[2]}")
    if row[0]:
        results = json.loads(row[0])
        for r in results:
            print(f"Step {r['stepNumber']}: {r['name']} -> {r['status']}")
            if r['status'] == 'failed':
                print(f"  Error: {r['error']}")
else:
    print("No test plan found")

conn.close()
