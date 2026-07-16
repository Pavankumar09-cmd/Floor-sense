import knex, { Knex } from 'knex';
import path from 'path';

const dbType = process.env.DB_TYPE || 'sqlite';

let config: Knex.Config;

if (dbType === 'postgres') {
  config = {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'floorsense',
    },
    pool: { min: 2, max: 10 }
  };
  console.log('Database Configured: PostgreSQL');
} else {
  config = {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, '../../../floorsense.sqlite')
    },
    useNullAsDefault: true
  };
  console.log(`Database Configured: SQLite (${path.join(__dirname, '../../../floorsense.sqlite')})`);
}

const db = knex(config);

export default db;
export { dbType };
