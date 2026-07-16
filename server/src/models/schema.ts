import db from '../config/database';

export async function initDatabase() {
  console.log('Initializing database schema...');

  // Projects table
  if (!(await db.schema.hasTable('projects'))) {
    await db.schema.createTable('projects', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.text('description').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('Created table: projects');
  }

  // Machines table
  if (!(await db.schema.hasTable('machines'))) {
    await db.schema.createTable('machines', (table) => {
      table.string('id').primary();
      table.string('project_id').references('id').inTable('projects').onDelete('CASCADE');
      table.string('name').notNullable();
      table.string('machine_type').notNullable().defaultTo('reactor_tank');
      table.integer('scan_period_ms').defaultTo(100);
      table.text('program').notNullable(); // JSON serialized list of PLC rungs and timers
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('Created table: machines');
  }

  // Tags table (Machine tags configuration)
  if (!(await db.schema.hasTable('tags'))) {
    await db.schema.createTable('tags', (table) => {
      table.string('id').primary();
      table.string('machine_id').references('id').inTable('machines').onDelete('CASCADE');
      table.string('name').notNullable();
      table.string('data_type').notNullable(); // bool, int, float
      table.string('address').notNullable();
      table.string('source').notNullable(); // sensor, actuator, internal
      table.text('description').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.unique(['machine_id', 'name']);
    });
    console.log('Created table: tags');
  }

  // Sequences table
  if (!(await db.schema.hasTable('sequences'))) {
    await db.schema.createTable('sequences', (table) => {
      table.string('id').primary();
      table.string('machine_id').references('id').inTable('machines').onDelete('CASCADE');
      table.string('name').notNullable();
      table.text('steps').notNullable(); // JSON serialized step list
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('Created table: sequences');
  }

  // Alarms table (Active and historical tracking)
  if (!(await db.schema.hasTable('alarms'))) {
    await db.schema.createTable('alarms', (table) => {
      table.string('id').primary();
      table.string('machine_id').references('id').inTable('machines').onDelete('CASCADE');
      table.string('name').notNullable();
      table.string('tag_ref').notNullable(); // Tag name reference
      table.string('condition').notNullable(); // e.g. "> 90.0" or "== true"
      table.string('priority').notNullable(); // high, medium, low
      table.string('state').notNullable(); // unacknowledged, acknowledged, cleared
      table.timestamp('raised_at').nullable();
      table.timestamp('acked_at').nullable();
      table.timestamp('cleared_at').nullable();
    });
    console.log('Created table: alarms');
  }

  // Event Logs table
  if (!(await db.schema.hasTable('event_logs'))) {
    await db.schema.createTable('event_logs', (table) => {
      table.increments('id').primary();
      table.string('machine_id').references('id').inTable('machines').onDelete('CASCADE');
      table.timestamp('timestamp').defaultTo(db.fn.now());
      table.string('source').notNullable(); // "system", "simulation", "operator"
      table.string('tag_ref').nullable();
      table.string('old_value').nullable();
      table.string('new_value').nullable();
      table.string('actor').nullable(); // Name or identifier of who changed it
    });
    console.log('Created table: event_logs');
  }

  // Test Plans table
  if (!(await db.schema.hasTable('test_plans'))) {
    await db.schema.createTable('test_plans', (table) => {
      table.string('id').primary();
      table.string('machine_id').references('id').inTable('machines').onDelete('CASCADE');
      table.string('name').notNullable();
      table.text('steps').notNullable(); // JSON serialized list of test validations (expected values, sequences)
      table.timestamp('last_run_at').nullable();
      table.string('pass_fail').nullable(); // "passed", "failed", or null
      table.text('results').nullable(); // JSON serialized list of step execution statuses
    });
    console.log('Created table: test_plans');
  }

  console.log('Database initialization complete.');
}
