import sqlite3
import datetime

conn = sqlite3.connect('floorsense.sqlite')
cursor = conn.cursor()

# Get the timestamp of the latest "STARTING TEST PLAN RUN"
cursor.execute("SELECT id, timestamp FROM event_logs WHERE new_value LIKE 'STARTING TEST PLAN RUN%' ORDER BY id DESC LIMIT 1")
row = cursor.fetchone()
if row:
    start_id, start_ts = row
    print(f"Latest run started at event ID {start_id}, TS: {start_ts} ({datetime.datetime.fromtimestamp(start_ts/1000)})")
    
    # Query all logs after this start event
    cursor.execute("SELECT id, timestamp, source, tag_ref, new_value, actor FROM event_logs WHERE id >= ? ORDER BY id ASC", (start_id,))
    for log in cursor.fetchall():
        ts_str = datetime.datetime.fromtimestamp(log[1]/1000).strftime('%H:%M:%S.%f')[:-3]
        print(f"[{ts_str}] {log[2]} | {log[3] if log[3] else 'SYS'}: {log[4]} ({log[5]})")
else:
    print("No test plan runs found")

conn.close()
