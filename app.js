const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');
const nodemailer = require('nodemailer');

require('dotenv').config();

// Email sending function
async function sendEmail(data) {
  try {
    const emailUser = process.env.EMAIL_USER || "agence.departtravel@gmail.com";
    const emailPassword = process.env.EMAIL_PASSWORD || "cwcnsdmgkoucvjwq";

    console.log("Email configuration: Starting email sending process");
    console.log(`Email recipient: ${data.to}`);
    console.log(`Email subject: ${data.subject}`);

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPassword
      },
      tls: {
        rejectUnauthorized: false
      },
      debug: true,
      logger: true
    });

    try {
      await transporter.verify();
      console.log("✅ SMTP connection verified successfully");
    } catch (verifyError) {
      console.error("❌ SMTP verification failed:", verifyError);
      return false;
    }

    console.log("Attempting to send email...");
    const result = await transporter.sendMail({
      from: '"Tunisia Tours Booking" <agence.departtravel@gmail.com>',
      to: data.to,
      subject: data.subject,
      html: data.html
    });

    console.log("✅ Email sent successfully. ID:", result.messageId);
    return true;
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    return false;
  }
}

// Email template function
function generateBookingEmail(bookingData, tourDetails = null) {
  console.log("Generating email template for booking:", bookingData.id);

  function safeGet(obj, path, defaultValue = "Not specified") {
    try {
      return path.split(".").reduce((o, p) => o && o[p] !== undefined ? o[p] : defaultValue, obj);
    } catch {
      return defaultValue;
    }
  }

  function formatDate(dateString) {
    if (!dateString) return "Not specified";
    try {
      return new Date(dateString).toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      });
    } catch {
      return dateString;
    }
  }

  const isJoinTour = safeGet(bookingData, "type") === "join";
  
  // Parse contact details properly
  let contactDetails = {};
  try {
    if (typeof bookingData.contact_details === 'string') {
      contactDetails = JSON.parse(bookingData.contact_details);
    } else {
      contactDetails = bookingData.contact_details || {};
    }
  } catch (e) {
    console.error("Error parsing contact details:", e);
    contactDetails = bookingData.contact_details || {};
  }

  // Tour information section
  let tourInfoSection = "";
  if (tourDetails && tourDetails.title) {
    tourInfoSection = `
    <h3>🏛️ Selected Tour</h3>
    <ul>
      <li><strong>Tour Title:</strong> ${tourDetails.title}</li>
      <li><strong>Tour Type:</strong> ${isJoinTour ? "Group Tour" : "Private Tour"}</li>
      <li><strong>Tour Price:</strong> $${tourDetails.price} per person</li>
      ${!isJoinTour ? `<li><strong>Note:</strong> Private tour - final pricing may be customized</li>` : ""}
    </ul>
    `;
  } else {
    // Fallback for when tour details are not available
    const tourId = safeGet(bookingData, "tour_id");
    if (tourId && tourId !== "Not specified" && tourId !== null) {
      tourInfoSection = `
      <h3>🏛️ Selected Tour</h3>
      <ul>
        <li><strong>Tour ID:</strong> ${tourId}</li>
        <li><strong>Tour Type:</strong> ${isJoinTour ? "Group Tour" : "Private Tour"}</li>
        <li><strong>Note:</strong> ${isJoinTour ? "Group" : "Private"} tour - pricing details will be confirmed</li>
      </ul>
      `;
    } else {
      // When no tour is selected (custom tour build)
      tourInfoSection = `
      <h3>🏛️ Tour Request</h3>
      <ul>
        <li><strong>Tour Type:</strong> ${isJoinTour ? "Group Tour" : "Private/Custom Tour"}</li>
        <li><strong>Note:</strong> Custom tour request - pricing will be provided based on requirements</li>
      </ul>
      `;
    }
  }

  return `
    <h2>🎉 New ${isJoinTour ? "Group" : "Private"} Tour Booking Request</h2>

    ${tourInfoSection}

    <h3>📞 Contact Details</h3>
    <ul>
      <li><strong>Name:</strong> ${safeGet(contactDetails, "fullName")}</li>
      <li><strong>Email:</strong> ${safeGet(contactDetails, "email")}</li>
      <li><strong>WhatsApp:</strong> ${safeGet(contactDetails, "whatsapp")}</li>
      <li><strong>Language:</strong> ${safeGet(contactDetails, "language")}</li>
      ${safeGet(contactDetails, "couponCode") !== "Not specified" && safeGet(contactDetails, "couponCode") !== "" ? 
        `<li><strong>Coupon Code:</strong> ${safeGet(contactDetails, "couponCode")}</li>` : ""}
      ${safeGet(contactDetails, "notes") !== "Not specified" && safeGet(contactDetails, "notes") !== "" ? 
        `<li><strong>Additional Notes:</strong> ${safeGet(contactDetails, "notes")}</li>` : ""}
    </ul>

    <h3>📅 Trip Details</h3>
    <ul>
      <li><strong>Start Date:</strong> ${formatDate(bookingData.start_date)}</li>
      <li><strong>End Date:</strong> ${formatDate(bookingData.end_date)}</li>
      <li><strong>Departure City:</strong> ${safeGet(bookingData, "departure_city")}</li>
      <li><strong>Adults:</strong> ${safeGet(bookingData, "adults")}</li>
      <li><strong>Children:</strong> ${safeGet(bookingData, "children")}</li>
      ${safeGet(bookingData, "budget") !== "Not specified" && safeGet(bookingData, "budget") !== null ? 
        `<li><strong>Customer Budget:</strong> ${safeGet(bookingData, "budget")} ${safeGet(bookingData, "currency")}</li>` : ""}
      <li><strong>Accommodation:</strong> ${safeGet(bookingData, "accommodation")}</li>
    </ul>

    <h3>🏷️ Booking Information</h3>
    <ul>
      <li><strong>Booking ID:</strong> ${bookingData.id}</li>
      <li><strong>Type:</strong> ${isJoinTour ? "Group Tour" : "Private Tour"}</li>
      <li><strong>Status:</strong> ${safeGet(bookingData, "status", "pending")}</li>
    </ul>

    <hr>
    <p><em>This booking was submitted on ${new Date().toLocaleString()}</em></p>
    <p>Please contact the customer as soon as possible to confirm their booking details.</p>
  `;
}

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection - Direct credentials for shared hosting
const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'depaeezj_trips',
  user: process.env.PGUSER || 'depaeezj_craft',
  password: process.env.PGPASSWORD || 'Craftme+911',
  ssl: false // Critical: NO SSL for shared hosting
});

pool.connect(async (err, client, release) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✅ Database connected successfully');

    // Ensure the admin user exists
    try {
      // Check for admin user
      const userResult = await client.query('SELECT * FROM users WHERE username = $1', ['crafty']);

      if (userResult.rows.length === 0) {
        console.log('Creating default admin user...');
        const hashedPassword = await hashPassword('Tr4v3lcomp25');
        await client.query(
          'INSERT INTO users (username, password, is_admin, role) VALUES ($1, $2, $3, $4)',
          ['crafty', hashedPassword, true, 'admin']
        );
        console.log('Default admin user created successfully');
      } else {
        console.log('Admin user already exists');
      }
    } catch (error) {
      console.error('Error setting up admin user:', error);
    }

    release();
  }
});

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb', parameterLimit: 50000 }));
app.use(cors());

app.use(session({
  secret: process.env.SESSION_SECRET || 'tunisia-tour-booking-secure-session-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to false for shared hosting
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(passport.initialize());
app.use(passport.session());

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function comparePasswords(supplied, stored) {
  if (!stored) return false;
  return await bcrypt.compare(supplied, stored);
}

passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      console.log('Attempting login for user:', username);

      // Log database connection info (without password)
      console.log('Database connection info:', {
        host: pool.options.host,
        port: pool.options.port,
        database: pool.options.database,
        user: pool.options.user
      });

      // Try both the username provided and the default admin credentials
      let result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

      // If no user found and trying to log in as 'admin', try 'crafty' as fallback
      if (result.rows.length === 0 && username === 'admin') {
        console.log('Admin user not found, trying fallback admin user...');
        result = await pool.query('SELECT * FROM users WHERE username = $1', ['crafty']);
      }

      console.log('User query returned rows:', result.rows.length);

      const user = result.rows[0];

      if (!user) {
        console.log('User not found in database');
        return done(null, false, { message: 'Invalid username or password' });
      }

      console.log('Found user:', { id: user.id, username: user.username, isAdmin: user.is_admin });

      const isValid = await comparePasswords(password, user.password);
      console.log('Password validation result:', isValid);

      if (!isValid) {
        console.log('Invalid password provided');
        return done(null, false, { message: 'Invalid username or password' });
      }

      // Ensure role property is set based on is_admin column
      user.role = user.is_admin === true ? 'admin' : 'user';

      return done(null, user);
    } catch (error) {
      console.error('Error during authentication:', error);
      return done(error);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error);
  }
});

// Auth routes
app.get('/api/user', (req, res) => {
  if (req.user) {
    // Create a clean user object with explicit role property
    const userResponse = {
      id: req.user.id,
      username: req.user.username,
      role: req.user.is_admin === true ? 'admin' : 'user',
      isAdmin: req.user.is_admin
    };

    // Ensure proper content type is set
    res.setHeader('Content-Type', 'application/json');
    res.json(userResponse);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.post('/api/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).json({ message: err.message });
    }
    if (!user) {
      console.log('Login failed for user:', req.body.username);
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    req.login(user, (err) => {
      if (err) {
        console.error('Session error:', err);
        return res.status(500).json({ message: err.message });
      }

      // Create a clean user object with explicit role property
      const userResponse = {
        id: user.id,
        username: user.username,
        role: user.is_admin === true ? 'admin' : 'user',
        is_admin: user.is_admin
      };

      console.log('User logged in successfully:', user.username);
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(userResponse);
    });
  })(req, res, next);
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email, role = 'user' } = req.body;

    const existingUser = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await hashPassword(password);
    const result = await pool.query(
      'INSERT INTO users (username, password, email, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [username, hashedPassword, email, role]
    );

    req.login(result.rows[0], (err) => {
      if (err) return res.status(500).json({ error: 'Login failed' });
      res.json(result.rows[0]);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ message: 'Logged out successfully' });
  });
});

// Tours routes
app.get('/api/tours', async (req, res) => {
  try {
    console.log('Fetching all tours from database...');
    const result = await pool.query('SELECT * FROM tours ORDER BY id');
    console.log(`Found ${result.rows.length} tours in database`);

    // Transform any JSON string arrays back to actual arrays if needed
    const processedTours = result.rows.map(tour => {
      // Create a copy of the tour object
      const processedTour = {...tour};

      // Handle arrays stored in various formats
      ['images', 'languages', 'highlights', 'included', 'notIncluded'].forEach(field => {
        // If it's already an array, leave it as is
        if (Array.isArray(processedTour[field])) {
          return;
        }

        // If it's a string starting with '{' and ending with '}' (PostgreSQL array format)
        if (typeof processedTour[field] === 'string' && 
            processedTour[field].startsWith('{') && 
            processedTour[field].endsWith('}')) {
          // Convert PostgreSQL array format to JavaScript array
          try {
            // Remove the braces and split by comma
            const arrayString = processedTour[field].substring(1, processedTour[field].length - 1);
            // Handle empty array
            if (!arrayString.trim()) {
              processedTour[field] = [];
            } else {
              // Correctly handle quoted values in PostgreSQL arrays
              // This is a more robust approach for dealing with PostgreSQL array syntax
              const values = [];
              let currentValue = '';
              let inQuotes = false;

              for (let i = 0; i < arrayString.length; i++) {
                const char = arrayString[i];

                if (char === '"' && (i === 0 || arrayString[i - 1] !== '\\')) {
                  inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                  values.push(currentValue.trim().replace(/^"(.*)"$/, '$1'));
                  currentValue = '';
                } else {
                  currentValue += char;
                }
              }

              // Don't forget the last value
              if (currentValue.trim()) {
                values.push(currentValue.trim().replace(/^"(.*)"$/, '$1'));
              }

              processedTour[field] = values;
            }
          } catch (e) {
            console.error(`Error parsing ${field} as PostgreSQL array:`, e);
            // If parsing fails, initialize as empty array
            processedTour[field] = [];
          }
        } 
        // If it's a JSON string, parse it
        else if (typeof processedTour[field] === 'string' && 
                 (processedTour[field].startsWith('[') || processedTour[field].startsWith('{'))) {
          try {
            processedTour[field] = JSON.parse(processedTour[field]);
          } catch (e) {
            console.error(`Error parsing ${field} as JSON:`, e);
            // If parsing fails, initialize as empty array
            processedTour[field] = [];
          }
        }
        // If field is null or undefined, initialize as empty array
        else if (processedTour[field] === null || processedTour[field] === undefined) {
          processedTour[field] = [];
        }
      });

      return processedTour;
    });

    res.json(processedTours);
  } catch (error) {
    console.error('Error fetching tours:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tours/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tours WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    // Create a copy of the tour object
    const processedTour = {...result.rows[0]};

    // Process array fields the same way as in the /api/tours endpoint
    ['images', 'languages', 'highlights', 'included', 'notIncluded'].forEach(field => {
      // If it's already an array, leave it as is
      if (Array.isArray(processedTour[field])) {
        return;
      }

      // If it's a string starting with '{' and ending with '}' (PostgreSQL array format)
      if (typeof processedTour[field] === 'string' && 
          processedTour[field].startsWith('{') && 
          processedTour[field].endsWith('}')) {
        // Convert PostgreSQL array format to JavaScript array
        try {
          // Remove the braces and split by comma
          const arrayString = processedTour[field].substring(1, processedTour[field].length - 1);
          // Handle empty array
          if (!arrayString.trim()) {
            processedTour[field] = [];
          } else {
            // Correctly handle quoted values in PostgreSQL arrays
            const values = [];
            let currentValue = '';
            let inQuotes = false;

            for (let i = 0; i < arrayString.length; i++) {
              const char = arrayString[i];

              if (char === '"' && (i === 0 || arrayString[i - 1] !== '\\')) {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim().replace(/^"(.*)"$/, '$1'));
                currentValue = '';
              } else {
                currentValue += char;
              }
            }

            // Don't forget the last value
            if (currentValue.trim()) {
              values.push(currentValue.trim().replace(/^"(.*)"$/, '$1'));
            }

            processedTour[field] = values;
          }
        } catch (e) {
          console.error(`Error parsing ${field} as PostgreSQL array:`, e);
          // If parsing fails, initialize as empty array
          processedTour[field] = [];
        }
      } 
      // If it's a JSON string, parse it
      else if (typeof processedTour[field] === 'string' && 
               (processedTour[field].startsWith('[') || processedTour[field].startsWith('{'))) {
        try {
          processedTour[field] = JSON.parse(processedTour[field]);
        } catch (e) {
          console.error(`Error parsing ${field} as JSON:`, e);
          // If parsing fails, initialize as empty array
          processedTour[field] = [];
        }
      }
      // If field is null or undefined, initialize as empty array
      else if (processedTour[field] === null || processedTour[field] === undefined) {
        processedTour[field] = [];
      }
    });

    res.json(processedTour);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/tours", async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'admin' && req.user.is_admin !== true)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Handle tour fields from frontend with proper image URL processing
    const { title, description, duration, price, images, type, city, rating, accommodation, highlights, included, notIncluded, languages } = req.body;

    // Process images array properly
    let processedImages = images;
    if (images) {
      if (typeof images === 'string') {
        try {
          // Try to parse if it's a JSON string
          processedImages = JSON.parse(images);
        } catch (e) {
          // If it's a single URL, convert to array
          if (images.startsWith('http')) {
            processedImages = [images];
          } else {
            // Split by newlines if multiple URLs
            processedImages = images.split('\n').filter(url => url.trim() !== '');
          }
        }
      }
      // Ensure it's an array
      if (!Array.isArray(processedImages)) {
        processedImages = [];
      }
    }

    // Create PostgreSQL array literals with proper escaping
    const pgArray = (arr) => {
      if (!arr || !Array.isArray(arr)) return '{}';

      // Properly escape each element for PostgreSQL array
      const escapedValues = arr.map(val => {
        if (val === null || val === undefined) return 'NULL';

        // Escape quotes and backslashes
        const escaped = val.toString()
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"');

        return `"${escaped}"`;
      });

      return `{${escapedValues.join(',')}}`;
    };

    const result = await pool.query(
      'INSERT INTO tours (title, description, duration, price, images, type, city, rating, accommodation, highlights, included, "notIncluded", languages) VALUES ($1, $2, $3, $4, $5::text[], $6, $7, $8, $9, $10::text[], $11::text[], $12::text[], $13::text[]) RETURNING *',
      [
        title, 
        description, 
        duration, 
        price, 
        pgArray(processedImages), 
        type, 
        city, 
        rating, 
        accommodation, 
        pgArray(highlights), 
        pgArray(included), 
        pgArray(notIncluded), 
        pgArray(languages)
      ]
    );

    // Process the result for the response
    const processedTour = {...result.rows[0]};

    // Convert PostgreSQL arrays to JavaScript arrays
    ['images', 'highlights', 'included', 'notIncluded', 'languages'].forEach(field => {
      if (typeof processedTour[field] === 'string' && 
          processedTour[field].startsWith('{') && 
          processedTour[field].endsWith('}')) {
        try {
          // Remove the curly braces and parse as array
          const arrayString = processedTour[field].substring(1, processedTour[field].length - 1);
          const values = [];
          let currentValue = '';
          let inQuotes = false;

          for (let i = 0; i < arrayString.length; i++) {
            const char = arrayString[i];

            if (char === '"' && (i === 0 || arrayString[i - 1] !== '\\')) {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(currentValue.trim().replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"'));
              currentValue = '';
            } else {
              currentValue += char;
            }
          }

          // Don't forget the last value
          if (currentValue.trim()) {
            values.push(currentValue.trim().replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"'));
          }

          processedTour[field] = values;
        } catch (e) {
          console.error(`Error parsing ${field} as PostgreSQL array:`, e);
          processedTour[field] = [];
        }
      } else if (processedTour[field] === null || processedTour[field] === undefined) {
        processedTour[field] = [];
      }
    });

    res.json(processedTour);
  } catch (error) {
    console.error('Error creating tour:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tours/:id', async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'admin' && req.user.is_admin !== true)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { title, description, duration, price, images, type, city, rating, accommodation, highlights, included, notIncluded, languages } = req.body;

    // Process images array properly
    let processedImages = images;
    if (images) {
      if (typeof images === 'string') {
        try {
          // Try to parse if it's a JSON string
          processedImages = JSON.parse(images);
        } catch (e) {
          // If it's a single URL, convert to array
          if (images.startsWith('http')) {
            processedImages = [images];
          } else {
            // Split by newlines if multiple URLs
            processedImages = images.split('\n').filter(url => url.trim() !== '');
          }
        }
      }
      // Ensure it's an array
      if (!Array.isArray(processedImages)) {
        processedImages = [];
      }
    }

    // Create PostgreSQL array literals with proper escaping
    const pgArray = (arr) => {
      if (!arr || !Array.isArray(arr)) return '{}';

      // Properly escape each element for PostgreSQL array
      const escapedValues = arr.map(val => {
        if (val === null || val === undefined) return 'NULL';

        // Escape quotes and backslashes
        const escaped = val.toString()
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"');

        return `"${escaped}"`;
      });

      return `{${escapedValues.join(',')}}`;
    };

    const result = await pool.query(
      'UPDATE tours SET title = $1, description = $2, duration = $3, price = $4, images = $5::text[], type = $6, city = $7, rating = $8, accommodation = $9, highlights = $10::text[], included = $11::text[], "notIncluded" = $12::text[], languages = $13::text[] WHERE id = $14 RETURNING *',
      [
        title, 
        description, 
        duration, 
        price, 
        pgArray(processedImages), 
        type, 
        city, 
        rating, 
        accommodation, 
        pgArray(highlights), 
        pgArray(included), 
        pgArray(notIncluded), 
        pgArray(languages), 
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    // Process the result for the response
    const processedTour = {...result.rows[0]};

    // Convert PostgreSQL arrays to JavaScript arrays
    ['images', 'highlights', 'included', 'notIncluded', 'languages'].forEach(field => {
      if (typeof processedTour[field] === 'string' && 
          processedTour[field].startsWith('{') && 
          processedTour[field].endsWith('}')) {
        try {
          // Remove the curly braces and parse as array
          const arrayString = processedTour[field].substring(1, processedTour[field].length - 1);
          const values = [];
          let currentValue = '';
          let inQuotes = false;

          for (let i = 0; i < arrayString.length; i++) {
            const char = arrayString[i];

            if (char === '"' && (i === 0 || arrayString[i - 1] !== '\\')) {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(currentValue.trim().replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"'));
              currentValue = '';
            } else {
              currentValue += char;
            }
          }

          // Don't forget the last value
          if (currentValue.trim()) {
            values.push(currentValue.trim().replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"'));
          }

          processedTour[field] = values;
        } catch (e) {
          console.error(`Error parsing ${field} as PostgreSQL array:`, e);
          processedTour[field] = [];
        }
      } else if (processedTour[field] === null || processedTour[field] === undefined) {
        processedTour[field] = [];
      }
    });

    res.json(processedTour);
  } catch (error) {
    console.error('Error updating tour:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/tours/:id", async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'admin' && req.user.is_admin !== true)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { title, description, duration, price, images, type, city, rating, accommodation, highlights, included, notIncluded, languages } = req.body;

    // Process images array properly
    let processedImages = images;
    if (images) {
      if (typeof images === 'string') {
        try {
          // Try to parse if it's a JSON string
          processedImages = JSON.parse(images);
        } catch (e) {
          // If it's a single URL, convert to array
          if (images.startsWith('http')) {
            processedImages = [images];
          } else {
            // Split by newlines if multiple URLs
            processedImages = images.split('\n').filter(url => url.trim() !== '');
          }
        }
      }
      // Ensure it's an array
      if (!Array.isArray(processedImages)) {
        processedImages = [];
      }
    }

    // Create PostgreSQL array literals with proper escaping
    const pgArray = (arr) => {
      if (!arr || !Array.isArray(arr)) return '{}';

      // Properly escape each element for PostgreSQL array
      const escapedValues = arr.map(val => {
        if (val === null || val === undefined) return 'NULL';

        // Escape quotes and backslashes
        const escaped = val.toString()
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"');

        return `"${escaped}"`;
      });

      return `{${escapedValues.join(',')}}`;
    };

    const result = await pool.query(
      'UPDATE tours SET title = $1, description = $2, duration = $3, price = $4, images = $5::text[], type = $6, city = $7, rating = $8, accommodation = $9, highlights = $10::text[], included = $11::text[], "notIncluded" = $12::text[], languages = $13::text[] WHERE id = $14 RETURNING *',
      [
        title, 
        description, 
        duration, 
        price, 
        pgArray(processedImages), 
        type, 
        city, 
        rating, 
        accommodation, 
        pgArray(highlights), 
        pgArray(included), 
        pgArray(notIncluded), 
        pgArray(languages), 
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    // Process the result for the response
    const processedTour = {...result.rows[0]};

    // Convert PostgreSQL arrays to JavaScript arrays
    ['images', 'highlights', 'included', 'notIncluded', 'languages'].forEach(field => {
      if (typeof processedTour[field] === 'string' && 
          processedTour[field].startsWith('{') && 
          processedTour[field].endsWith('}')) {
        try {
          // Remove the curly braces and parse as array
          const arrayString = processedTour[field].substring(1, processedTour[field].length - 1);
          const values = [];
          let currentValue = '';
          let inQuotes = false;

          for (let i = 0; i < arrayString.length; i++) {
            const char = arrayString[i];

            if (char === '"' && (i === 0 || arrayString[i - 1] !== '\\')) {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(currentValue.trim().replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"'));
              currentValue = '';
            } else {
              currentValue += char;
            }
          }

          // Don't forget the last value
          if (currentValue.trim()) {
            values.push(currentValue.trim().replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"'));
          }

          processedTour[field] = values;
        } catch (e) {
          console.error(`Error parsing ${field} as PostgreSQL array:`, e);
          processedTour[field] = [];
        }
      } else if (processedTour[field] === null || processedTour[field] === undefined) {
        processedTour[field] = [];
      }
    });

    res.json(processedTour);
  } catch (error) {
    console.error('Error updating tour:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tours/:id', async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'admin' && req.user.is_admin !== true)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const tourId = req.params.id;

    // First, check if the tour exists
    const tourCheck = await pool.query('SELECT * FROM tours WHERE id = $1', [tourId]);
    if (tourCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    // Delete all bookings associated with this tour first
    await pool.query('DELETE FROM bookings WHERE tour_id = $1', [tourId]);
    console.log(`Deleted bookings for tour ID: ${tourId}`);

    // Now delete the tour
    const result = await pool.query('DELETE FROM tours WHERE id = $1 RETURNING *', [tourId]);

    res.json({ message: 'Tour and associated bookings deleted successfully' });
  } catch (error) {
    console.error('Error deleting tour:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bookings route
app.post('/api/bookings', async (req, res) => {
  try {
    console.log("Booking request received:", JSON.stringify(req.body));

    // Validate required fields
    if (!req.body.startDate || !req.body.endDate || !req.body.departureCity || 
        !req.body.adults || !req.body.contactDetails) {
      return res.status(400).json({ error: "Missing required booking fields" });
    }

    // Convert dates properly
    let startDate, endDate;
    try {
      startDate = new Date(req.body.startDate);
      endDate = new Date(req.body.endDate);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error("Invalid date format");
      }

      startDate = startDate.toISOString().split('T')[0];
      endDate = endDate.toISOString().split('T')[0];

      console.log("Converted dates:", { startDate, endDate });
    } catch (error) {
      console.error("Date conversion error:", error);
      return res.status(400).json({ error: "Invalid date format provided" });
    }

    // Debug the tour_id - comprehensive logging
    console.log("=== TOUR ID DEBUGGING ===");
    console.log("Full request body:", JSON.stringify(req.body, null, 2));
    console.log("Request tourId:", req.body.tourId);
    console.log("Request tourId type:", typeof req.body.tourId);
    console.log("Request days:", req.body.days);
    
    // Handle tour_id from different sources
    let tourId = null;
    
    // Check if tourId is provided directly
    if (req.body.tourId && req.body.tourId !== "undefined" && req.body.tourId !== "" && req.body.tourId !== "null") {
      tourId = parseInt(req.body.tourId);
      if (isNaN(tourId)) {
        tourId = null;
      }
      console.log("Tour ID from direct tourId field:", tourId);
    }
    
    // If no direct tourId, check if it's in the days array (for private tours)
    if (!tourId && req.body.days && Array.isArray(req.body.days) && req.body.days.length > 0) {
      const firstDay = req.body.days[0];
      if (firstDay && firstDay.tourId) {
        tourId = parseInt(firstDay.tourId);
        if (isNaN(tourId)) {
          tourId = null;
        }
        console.log("Tour ID from days array:", tourId);
      }
    }
    
    // If still no tourId, try to get it from the tour name in days
    if (!tourId && req.body.days && Array.isArray(req.body.days) && req.body.days.length > 0) {
      const firstDay = req.body.days[0];
      if (firstDay && firstDay.tour) {
        try {
          const tourByNameQuery = await pool.query('SELECT id FROM tours WHERE title = $1', [firstDay.tour]);
          if (tourByNameQuery.rows.length > 0) {
            tourId = tourByNameQuery.rows[0].id;
            console.log("Tour ID from tour name lookup:", tourId);
          }
        } catch (error) {
          console.error("Error looking up tour by name:", error);
        }
      }
    }
    
    console.log("Final processed tourId for database:", tourId);
    console.log("=== END TOUR ID DEBUGGING ===");

    const result = await pool.query(
      `INSERT INTO bookings (
        tour_id, start_date, end_date, departure_city, 
        adults, children, budget, currency, accommodation, 
        contact_details, status, days, type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        tourId,
        startDate,
        endDate,
        req.body.departureCity,
        parseInt(req.body.adults),
        parseInt(req.body.children) || 0,
        req.body.budget ? parseFloat(req.body.budget) : null,
        req.body.currency || null,
        req.body.accommodation || null,
        JSON.stringify(req.body.contactDetails),
        "pending",
        req.body.days ? JSON.stringify(req.body.days) : null,
        req.body.type || null
      ]
    );

    console.log("Booking created successfully:", result.rows[0]);

    // Send email notification
    try {
      // Get tour details if tour_id exists (for both private and group tours)
      let tourDetails = null;
      console.log("Booking data tour_id:", result.rows[0].tour_id);
      console.log("Original request tour_id:", req.body.tourId);
      
      if (result.rows[0].tour_id && result.rows[0].tour_id !== null) {
        try {
          console.log("Fetching tour details for ID:", result.rows[0].tour_id);
          const tourQuery = await pool.query('SELECT title, price, duration, type FROM tours WHERE id = $1', [result.rows[0].tour_id]);
          console.log("Tour query result:", tourQuery.rows);
          
          if (tourQuery.rows.length > 0) {
            tourDetails = tourQuery.rows[0];
            console.log("✅ Tour details fetched successfully:", tourDetails);
          } else {
            console.log("❌ No tour found with ID:", result.rows[0].tour_id);
            
            // Try to get all tours to see what's available
            const allToursQuery = await pool.query('SELECT id, title FROM tours');
            console.log("Available tours in database:", allToursQuery.rows);
          }
        } catch (tourError) {
          console.error("❌ Error fetching tour details:", tourError);
        }
      } else {
        console.log("❌ No valid tour_id in booking data. tour_id:", result.rows[0].tour_id);
      }

      const emailHtml = generateBookingEmail(result.rows[0], tourDetails);
      console.log("Sending booking notification email to agency");

      const emailResult = await sendEmail({
        to: "agence.departtravel@gmail.com",
        subject: "New Booking Request - Tunisia Tours",
        html: emailHtml
      });

      if (emailResult) {
        console.log("✅ Booking email notification sent successfully");
      } else {
        console.error("❌ Failed to send booking email notification");
      }
    } catch (emailError) {
      console.error("Error sending booking notification email:", emailError);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Make sure /api/login and /api/auth/login both work for compatibility
app.post('/api/auth/login', (req, res, next) => {
  // Forward to /api/login
  req.url = '/api/login';
  app._router.handle(req, res, next);
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Handle SPA routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);

  // Handle specific error types
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ 
      message: "Request entity too large. Please reduce image size or number of images." 
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      message: "Invalid data format", 
      details: err.message 
    });
  }

  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({ 
      message: "Database connection failed" 
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Log more details for debugging
  console.error("Error details:", {
    url: req.url,
    method: req.method,
    body: req.body ? Object.keys(req.body) : 'no body',
    error: err.stack
  });

  res.status(status).json({ message });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Server running on port ' + PORT);
  console.log('📍 Environment: ' + process.env.NODE_ENV);
});

module.exports = app;