import sqlite3

conn = sqlite3.connect('floorsense.sqlite')
cursor = conn.cursor()

print("--- SEQ_STEP / TON_DWELL / DWELL_ET Logs ---")
cursor.execute("""
    SELECT id, timestamp, source, tag_ref, new_value, actor 
    FROM event_logs 
    WHERE tag_ref IN ('SEQ_STEP', 'TON_DWELL', 'DWELL_ET') 
       OR new_value LIKE '%ALARM%' 
       OR new_value LIKE '%START%'
       OR new_value LIKE '%TEST%'
    ORDER BY id ASC
""")
for row in cursor.fetchall():
    print(f"[{row[1]}] {row[2]} | {row[3]}: {row[4]} ({row[5]})")

conn.close()
