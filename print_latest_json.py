import sqlite3

conn = sqlite3.connect('floorsense.sqlite')
cursor = conn.cursor()
cursor.execute("SELECT results FROM test_plans WHERE id='tp_demo1'")
row = cursor.fetchone()
if row and row[0]:
    print(row[0])
conn.close()
