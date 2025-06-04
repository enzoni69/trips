/**
 * Database setup script for Tunisia Tour Application
 * This script ensures the database tables are created and an admin user exists
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Database connection - Direct credentials for shared hosting
const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'depaeezj_trips',
  user: process.env.PGUSER || 'depaeezj_craft',
  password: process.env.PGPASSWORD || 'Craftme+911',
  ssl: false
});

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function setupDatabase() {
  console.log('Starting database setup...');
  
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Create users table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        role VARCHAR(50) DEFAULT 'user'
      )
    `);
    console.log('✓ Users table verified');
    
    // Create tours table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS tours (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        duration INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        images TEXT[] NOT NULL,
        type TEXT NOT NULL,
        city TEXT NOT NULL,
        languages TEXT[],
        rating DECIMAL(3,1) DEFAULT 4.5,
        accommodation TEXT DEFAULT 'Standard',
        highlights TEXT[],
        included TEXT[],
        "notIncluded" TEXT[]
      )
    `);
    console.log('✓ Tours table verified');
    
    // Create bookings table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        tour_id INTEGER REFERENCES tours(id),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        departure_city TEXT NOT NULL,
        adults INTEGER NOT NULL,
        children INTEGER NOT NULL,
        budget DECIMAL(10,2),
        currency TEXT,
        accommodation TEXT,
        contact_details JSONB NOT NULL,
        status TEXT NOT NULL,
        days JSONB,
        type TEXT
      )
    `);
    console.log('✓ Bookings table verified');

    // Create sessions table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
      )
    `);
    console.log('✓ Sessions table verified');
    
    // Check for admin user
    const userResult = await client.query('SELECT * FROM users WHERE username = $1', ['crafty']);
    
    if (userResult.rows.length === 0) {
      console.log('Creating admin user...');
      const hashedPassword = await hashPassword('Tr4v3lcomp25');
      await client.query(
        'INSERT INTO users (username, password, is_admin, role) VALUES ($1, $2, $3, $4)',
        ['crafty', hashedPassword, true, 'admin']
      );
      console.log('✓ Admin user created');
    } else {
      console.log('✓ Admin user already exists');
    }
    
    // Check if tours table is empty
    const toursResult = await client.query('SELECT COUNT(*) FROM tours');
    
    if (parseInt(toursResult.rows[0].count) === 0) {
      console.log('Adding sample tours...');
      
      const sampleTours = [
        {
          title: 'Grand Tunisia Tour',
          description: 'Experience the best of Tunisia in this comprehensive tour covering major historical sites, beautiful beaches, and desert adventures.',
          duration: 7,
          price: 1200,
          images: '{https://images.unsplash.com/photo-1590167409677-4387931bb002}',
          type: 'group',
          city: 'Tunis',
          highlights: '{Historical sites,Beach activities,Local cuisine}',
          included: '{Transportation,Accommodation,Guided tours}',
          notIncluded: '{International flights,Personal expenses}'
        },
        {
          title: 'Sahara Desert Adventure',
          description: 'Journey into the heart of the Sahara Desert with camel trekking and camping under the stars.',
          duration: 5,
          price: 800,
          images: '{https://images.unsplash.com/photo-1509023464722-18d996393ca8}',
          type: 'group',
          city: 'Douz',
          highlights: '{Camel riding,Desert camping,Stargazing}',
          included: '{Transportation,Accommodation,Meals}',
          notIncluded: '{International flights,Personal expenses}'
        },
        {
          title: 'Coastal Mediterranean Tour',
          description: 'Explore Tunisia\'s beautiful Mediterranean coastline with pristine beaches and charming fishing villages.',
          duration: 4,
          price: 600,
          images: '{https://images.unsplash.com/photo-1596627116790-af6f46bdcace}',
          type: 'private',
          city: 'Hammamet',
          highlights: '{Beach time,Water activities,Fresh seafood}',
          included: '{Transportation,Accommodation,Some meals}',
          notIncluded: '{International flights,Personal expenses}'
        }
      ];
      
      for (const tour of sampleTours) {
        await client.query(`
          INSERT INTO tours (title, description, duration, price, images, type, city, highlights, included, "notIncluded")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          tour.title,
          tour.description,
          tour.duration,
          tour.price,
          tour.images,
          tour.type,
          tour.city,
          tour.highlights,
          tour.included,
          tour.notIncluded
        ]);
      }
      
      console.log('✓ Sample tours added');
    } else {
      console.log('✓ Tours already exist in database');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Database setup completed successfully');
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('❌ Database setup error:', error);
    throw error;
  } finally {
    // Release client
    client.release();
  }
}

// Run setup
setupDatabase()
  .then(() => {
    console.log('Database setup completed, exiting...');
    process.exit(0);
  })
  .catch(err => {
    console.error('Database setup failed:', err);
    process.exit(1);
  });