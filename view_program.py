import sqlite3
import json

conn = sqlite3.connect('floorsense.sqlite')
cursor = conn.cursor()
cursor.execute("SELECT program FROM machines WHERE id='mach_reactor1'")
row = cursor.fetchone()
if row and row[0]:
    print(json.dumps(json.loads(row[0]), indent=2))
conn.close()
