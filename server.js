var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt as scrypt2, randomBytes as randomBytes2, timingSafeEqual } from "crypto";
import { promisify as promisify2 } from "util";

// server/storage.ts
import session from "express-session";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";
import connectPgSimple from "connect-pg-simple";

// server/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  bookings: () => bookings,
  contactDetailsSchema: () => contactDetailsSchema,
  insertBookingSchema: () => insertBookingSchema,
  insertTourSchema: () => insertTourSchema,
  insertUserSchema: () => insertUserSchema,
  supportedLanguages: () => supportedLanguages,
  tours: () => tours,
  tunisiaCities: () => tunisiaCities,
  users: () => users
});
import { pgTable, text, serial, integer, decimal, date, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull()
});
var tours = pgTable("tours", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  duration: integer("duration").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  images: text("images").array().notNull(),
  type: text("type", { enum: ["private", "group", "custom"] }).notNull(),
  city: text("city").notNull(),
  languages: text("languages").array(),
  rating: decimal("rating", { precision: 3, scale: 1 }).default("4.5"),
  accommodation: text("accommodation", { enum: ["Economy", "Standard", "Luxury", "Camping"] }).default("Standard"),
  highlights: text("highlights").array(),
  included: text("included").array(),
  notIncluded: text("notIncluded").array()
});
var bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  tourId: integer("tour_id").references(() => tours.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  departureCity: text("departure_city").notNull(),
  adults: integer("adults").notNull(),
  children: integer("children").notNull(),
  budget: decimal("budget", { precision: 10, scale: 2 }),
  currency: text("currency", { enum: ["USD", "EUR", "GBP"] }),
  accommodation: text("accommodation", { enum: ["Economy", "Standard", "Luxury", "Camping"] }),
  contactDetails: json("contact_details").notNull(),
  status: text("status", { enum: ["pending", "confirmed", "cancelled"] }).notNull(),
  days: json("days"),
  type: text("type", { enum: ["private", "join", "build"] })
});
var insertUserSchema = createInsertSchema(users);
var insertTourSchema = createInsertSchema(tours);
var insertBookingSchema = createInsertSchema(bookings);
var tunisiaCities = [
  "Tunis",
  "Sfax",
  "Sousse",
  "Kairouan",
  "Bizerte",
  "Gab\xE8s",
  "Ariana",
  "Gafsa",
  "Kasserine",
  "Monastir",
  "Hammamet",
  "Nabeul",
  "Djerba",
  "Douz"
];
var supportedLanguages = [
  "English",
  "French",
  "Spanish",
  "Italian",
  "Arabic",
  "German",
  "Polish",
  "Portuguese"
];
var contactDetailsSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  language: z.enum(["english", "french", "german", "spanish", "arabic", "italian"], {
    errorMap: () => ({ message: "Please select a language" })
  }),
  flightCode: z.string().optional(),
  countryCode: z.string().min(1, "Country code is required"),
  whatsapp: z.string().min(5, "WhatsApp number must be at least 5 characters"),
  email: z.string().email("Invalid email address"),
  couponCode: z.string().optional(),
  notes: z.string().optional()
});

// server/db.ts
var pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'depaeezj_trips',
  user: 'depaeezj_craft',
  password: 'Craftme+911',
  ssl: false // Explicitly set SSL to false for shared hosting environment
});
pool.on("connect", () => {
  console.log("Connected to PostgreSQL database");
});
pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
  if (process.env.NODE_ENV !== "production") {
    process.exit(-1);
  }
});
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
var scryptAsync = promisify(scrypt);
var DatabaseStorage = class {
  // Remove the MemStorage class from the imports at the top of the file
  sessionStore;
  async hashPassword(password) {
    const salt = randomBytes(16).toString("hex");
    const buf = await scryptAsync(password, salt, 64);
    return `${buf.toString("hex")}.${salt}`;
  }
  constructor() {
    const PgSession = connectPgSimple(session);
    this.sessionStore = new PgSession({
      pool,
      // Use the already established pool
      tableName: "sessions",
      // Custom session table name
      createTableIfMissing: true
    });
    this.initializeDefaultAdmin();
    this.seedInitialToursIfEmpty();
  }
  async initializeDefaultAdmin() {
    try {
      // Check for both possible admin usernames
      const existingAdmin = await this.getUserByUsername("admin");
      const existingAymen = await this.getUserByUsername("Aymen");

      if (!existingAdmin && !existingAymen) {
        console.log("Creating default admin user...");
        const hashedPassword = await this.hashPassword("admin123");
        await this.createUser({
          username: "admin",
          password: hashedPassword,
          isAdmin: true
        });
      }
    } catch (error) {
      console.error("Error initializing default admin:", error);
    }
  }
  async seedInitialToursIfEmpty() {
    try {
      const existingTours = await db.select().from(tours);
      if (existingTours.length > 0) {
        console.log("Tours already exist in database, skipping seed data");
        return;
      }
      console.log("Seeding initial tours data...");
      const sampleTours = [
        {
          title: "Grand Tunisia Tour",
          description: "Experience the best of Tunisia in this comprehensive tour covering major historical sites, beautiful beaches, and desert adventures. Visit ancient Roman ruins, explore traditional markets, and enjoy local cuisine.",
          duration: 7,
          price: "1200",
          images: [
            "https://images.unsplash.com/photo-1590167409677-4387931bb002",
            "https://images.unsplash.com/photo-1590077428593-a55bb07c4665",
            "https://images.unsplash.com/photo-1548019979-dfd019e14f0e"
          ],
          type: "group",
          // Type assertion to satisfy TypeScript
          city: "Tunis"
        },
        {
          title: "Sahara Desert Adventure",
          description: "Journey into the heart of the Sahara Desert. Experience camel trekking, camping under the stars, and exploring traditional Berber villages. Perfect for adventure seekers and photography enthusiasts.",
          duration: 5,
          price: "800",
          images: [
            "https://images.unsplash.com/photo-1509023464722-18d996393ca8",
            "https://images.unsplash.com/photo-1547235001-d703406d3f17",
            "https://images.unsplash.com/photo-1682686580036-b5e25932ce9a"
          ],
          type: "group",
          city: "Douz"
        },
        {
          title: "Coastal Mediterranean Tour",
          description: "Explore Tunisia's beautiful Mediterranean coastline. Visit pristine beaches, ancient Phoenician ports, and charming fishing villages. Includes water activities and fresh seafood experiences.",
          duration: 4,
          price: "600",
          images: [
            "https://images.unsplash.com/photo-1596627116790-af6f46bdcace",
            "https://images.unsplash.com/photo-1596627116880-4891b48bfd61",
            "https://images.unsplash.com/photo-1596627116763-0458c38a24fb"
          ],
          type: "group",
          city: "Hammamet"
        },
        {
          title: "Djerba Tour",
          description: "Discover the enchanting island of Djerba with its rich history, beautiful beaches, and traditional architecture. Visit the famous Houmt Souk, explore ancient synagogues, and enjoy local handicrafts.",
          duration: 3,
          price: "400",
          images: [
            "https://images.unsplash.com/photo-1584551246679-0daf3d275d0f",
            "https://images.unsplash.com/photo-1584551246681-a513419d4e4c",
            "https://images.unsplash.com/photo-1584551246680-6f0a16f38e1c"
          ],
          type: "private",
          city: "Djerba"
        },
        {
          title: "Tunisian Sahara Explorer",
          description: "Experience the magic of the Tunisian Sahara with this exclusive private tour. Visit the salt flats of Chott el Djerid, explore the mountain oases, and enjoy a sunset camel ride in the golden dunes.",
          duration: 4,
          price: "700",
          images: [
            "https://images.unsplash.com/photo-1512958789366-0a936ea9d9ba",
            "https://images.unsplash.com/photo-1547235001-d703406d3f17",
            "https://images.unsplash.com/photo-1682686580036-b5e25932ce9a"
          ],
          type: "private",
          city: "Douz"
        }
      ];
      for (const tour of sampleTours) {
        await this.createTour(tour);
      }
      console.log("Initial tours seeded successfully");
    } catch (error) {
      console.error("Error seeding initial tours:", error);
    }
  }
  async getUser(id) {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || void 0;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      throw error;
    }
  }
  async getUserByUsername(username) {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user || void 0;
    } catch (error) {
      console.error("Error getting user by username:", error);
      throw error;
    }
  }
  async createUser(insertUser) {
    try {
      const [user] = await db.insert(users).values(insertUser).returning();
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }
  async getAllTours() {
    try {
      return await db.select().from(tours);
    } catch (error) {
      console.error("Error getting all tours:", error);
      throw error;
    }
  }
  async getTour(id) {
    try {
      const [tour] = await db.select().from(tours).where(eq(tours.id, id));
      return tour || void 0;
    } catch (error) {
      console.error("Error getting tour by ID:", error);
      throw error;
    }
  }
  async createTour(insertTour) {
    try {
      const sanitizedTour = {
        ...insertTour,
        languages: insertTour.languages ?? null,
        rating: insertTour.rating ?? null,
        accommodation: insertTour.accommodation ?? null,
        highlights: insertTour.highlights ?? null,
        included: insertTour.included ?? null,
        notIncluded: insertTour.notIncluded ?? null
      };
      const [tour] = await db.insert(tours).values(sanitizedTour).returning();
      return tour;
    } catch (error) {
      console.error("Error creating tour:", error);
      throw error;
    }
  }
  async updateTour(id, insertTour) {
    try {
      const existingTour = await this.getTour(id);
      if (!existingTour) return void 0;
      const sanitizedTour = {
        ...insertTour,
        languages: insertTour.languages ?? null,
        rating: insertTour.rating ?? null,
        accommodation: insertTour.accommodation ?? null,
        highlights: insertTour.highlights ?? null,
        included: insertTour.included ?? null,
        notIncluded: insertTour.notIncluded ?? null
      };
      const [updatedTour] = await db.update(tours).set(sanitizedTour).where(eq(tours.id, id)).returning();
      return updatedTour;
    } catch (error) {
      console.error("Error updating tour:", error);
      throw error;
    }
  }
  async deleteTour(id) {
    try {
      await db.delete(tours).where(eq(tours.id, id));
    } catch (error) {
      console.error("Error deleting tour:", error);
      throw error;
    }
  }

  // FIXED: Direct SQL booking creation that bypasses Drizzle ORM completely
  async createBooking(insertBooking) {
    try {
      console.log("Creating booking with raw SQL - data:", JSON.stringify(insertBooking));

      // Use raw SQL query with exact database column names
      const query = `
        INSERT INTO bookings (
          tour_id, start_date, end_date, departure_city, 
          adults, children, budget, currency, accommodation, 
          contact_details, status, days, type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;

      const values = [
        insertBooking.tourId || null,
        insertBooking.startDate,
        insertBooking.endDate,
        insertBooking.departureCity,
        insertBooking.adults,
        insertBooking.children,
        insertBooking.budget || null,
        insertBooking.currency || null,
        insertBooking.accommodation || null,
        JSON.stringify(insertBooking.contactDetails),
        insertBooking.status || "pending",
        insertBooking.days ? JSON.stringify(insertBooking.days) : null,
        insertBooking.type || null
      ];

      console.log("SQL Query:", query);
      console.log("SQL Values:", values);

      const result = await pool.query(query, values);
      const booking = result.rows[0];

      // Convert snake_case to camelCase for consistency
      const bookingWithCreatedAt = {
        id: booking.id,
        tourId: booking.tour_id,
        startDate: booking.start_date,
        endDate: booking.end_date,
        departureCity: booking.departure_city,
        adults: booking.adults,
        children: booking.children,
        budget: booking.budget,
        currency: booking.currency,
        accommodation: booking.accommodation,
        contactDetails: booking.contact_details,
        status: booking.status,
        days: booking.days,
        type: booking.type,
        createdAt: new Date()
      };

      console.log("Booking created successfully with raw SQL:", JSON.stringify(bookingWithCreatedAt));
      return bookingWithCreatedAt;
    } catch (error) {
      console.error("Error creating booking with raw SQL:", error);
      throw error;
    }
  }
};
var storage = new DatabaseStorage();

// server/auth.ts
var scryptAsync2 = promisify2(scrypt2);
async function hashPassword(password) {
  const salt = randomBytes2(16).toString("hex");
  const buf = await scryptAsync2(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  if (!stored) return false;
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync2(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app2) {
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "tunisia-tour-booking-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1e3 * 60 * 60 * 24,
      // 1 day
      secure: process.env.NODE_ENV === "production"
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !await comparePasswords(password, user.password)) {
          return done(null, false);
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password)
      });
      req.login(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user) => {
      if (err) return next(err);
      if (!user) return res.status(400).send("Invalid credentials");
      req.login(user, (err2) => {
        if (err2) return next(err2);
        res.json(user);
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).send("Logout failed");
      }
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}

// server/email.ts
import nodemailer from "nodemailer";
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
      console.log("\u2705 SMTP connection verified successfully");
    } catch (verifyError) {
      console.error("\u274C SMTP verification failed:", verifyError);
      if (verifyError && verifyError.toString && verifyError.toString().includes("Invalid login")) {
        console.error("\u{1F4E7} Authentication error - Please check your EMAIL_PASSWORD environment variable");
        console.error("Note: Gmail may require you to enable 'Less secure app access' or use an App Password");
      }
      return false;
    }
    console.log("Attempting to send email...");
    const result = await transporter.sendMail({
      from: '"Depart Travel Services" <agence.departtravel@gmail.com>',
      to: data.to,
      subject: data.subject,
      html: data.html
    });
    console.log("\u2705 Email sent successfully. ID:", result.messageId);
    console.log("Preview URL:", nodemailer.getTestMessageUrl(result));
    return true;
  } catch (error) {
    console.error("\u274C Email sending failed:", error);
    if (error && error.toString) {
      const errorMessage = error.toString();
      if (errorMessage.includes("ECONNREFUSED")) {
        console.error("Connection refused - Check your network connection and SMTP server settings");
      } else if (errorMessage.includes("ETIMEDOUT")) {
        console.error("Connection timed out - Check your network and firewall settings");
      } else if (errorMessage.includes("ESOCKET")) {
        console.error("Socket error - There may be an issue with your network configuration");
      } else if (errorMessage.includes("Invalid login")) {
        console.error("Authentication error - Check your email credentials");
        console.error("Gmail may require an App Password if 2FA is enabled");
      }
    }
    return false;
  }
}
function generateBookingEmail(bookingData) {
  console.log("Email template data:", JSON.stringify(bookingData));
  console.log("Email data - booking type:", bookingData.type);
  console.log("Email data - tour ID:", bookingData.tourId);
  function safeGet(obj, path, defaultValue = "Not specified") {
    try {
      return path.split(".").reduce((o, p) => o && o[p] !== void 0 ? o[p] : defaultValue, obj);
    } catch {
      return defaultValue;
    }
  }
  function formatDate(dateString) {
    if (!dateString) return "Not specified";
    try {
      return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return dateString;
    }
  }
  const bookingDataSafe = JSON.parse(JSON.stringify(bookingData || {}));
  const isJoinTour = safeGet(bookingDataSafe, "type") === "join";
  return `
    <h2>New ${isJoinTour ? "Group" : "Private"} Tour Booking Request</h2>
    <h3>Contact Details</h3>
    <ul>
      <li><strong>Name:</strong> ${safeGet(bookingDataSafe, "contactDetails.fullName")}</li>
      <li><strong>Email:</strong> ${safeGet(bookingDataSafe, "contactDetails.email")}</li>
      <li><strong>WhatsApp:</strong> ${safeGet(bookingDataSafe, "contactDetails.whatsapp")}</li>
      <li><strong>Language:</strong> ${safeGet(bookingDataSafe, "contactDetails.language")}</li>
      ${safeGet(bookingDataSafe, "contactDetails.flightCode") !== "Not specified" ? `<li><strong>Flight Code:</strong> ${safeGet(bookingDataSafe, "contactDetails.flightCode")}</li>` : ""}
      ${safeGet(bookingDataSafe, "contactDetails.couponCode") !== "Not specified" && safeGet(bookingDataSafe, "contactDetails.couponCode") !== "" ? `<li><strong>Coupon Code:</strong> ${safeGet(bookingDataSafe, "contactDetails.couponCode")}</li>` : ""}
      ${safeGet(bookingDataSafe, "contactDetails.notes") !== "Not specified" ? `<li><strong>Additional Notes:</strong> ${safeGet(bookingDataSafe, "contactDetails.notes")}</li>` : ""}
    </ul>

    <h3>Booking Details</h3>
    <ul>
      <li><strong>Start Date:</strong> ${formatDate(safeGet(bookingDataSafe, "startDate"))}</li>
      <li><strong>End Date:</strong> ${formatDate(safeGet(bookingDataSafe, "endDate"))}</li>
      <li><strong>Departure City:</strong> ${safeGet(bookingDataSafe, "departureCity")}</li>
      <li><strong>Adults:</strong> ${safeGet(bookingDataSafe, "adults")}</li>
      <li><strong>Children:</strong> ${safeGet(bookingDataSafe, "children")}</li>
      ${safeGet(bookingDataSafe, "budget") !== "Not specified" ? `<li><strong>Budget:</strong> ${safeGet(bookingDataSafe, "budget")} ${safeGet(bookingDataSafe, "currency", "USD")}</li>` : ""}
      ${safeGet(bookingDataSafe, "accommodation") !== "Not specified" ? `<li><strong>Accommodation:</strong> ${safeGet(bookingDataSafe, "accommodation")}</li>` : ""}
    </ul>

    ${safeGet(bookingDataSafe, "days") && Array.isArray(safeGet(bookingDataSafe, "days")) && safeGet(bookingDataSafe, "days").length > 0 ? `
    <h3>Itinerary</h3>
    <ul>
      ${safeGet(bookingDataSafe, "days").map((day, index) => `
        <li><strong>Day ${index + 1}:</strong> ${safeGet(day, "tour", "Tour not specified")} - ${safeGet(day, "accommodation", "Standard")} accommodation</li>
      `).join("")}
    </ul>
    ` : ""}

    <p><strong>Booking ID:</strong> ${safeGet(bookingDataSafe, "id", "Pending")}</p>
    <p><strong>Status:</strong> ${safeGet(bookingDataSafe, "status", "Pending")}</p>

    <hr>
    <p><em>This booking request was submitted through Depart Travel Services website.</em></p>
  `;
}

// server/routes.ts
import express from "express";
function registerRoutes(app2) {
  setupAuth(app2);
  app2.use(express.json({ limit: "50mb" }));
  app2.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app2.get("/api/status", (req, res) => {
    res.json({ status: "ok", message: "Server is running" });
  });
  app2.get("/api/tours", async (req, res) => {
    const tours2 = await storage.getAllTours();
    res.json(tours2);
  });
  app2.post("/api/tours", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).send("Admin access required");
    }
    const tourData = { ...req.body };
    console.log("Tour creation request data:", JSON.stringify(tourData));
    if (typeof tourData.price === "number") {
      tourData.price = tourData.price.toString();
    }
    if (typeof tourData.rating === "number") {
      tourData.rating = tourData.rating.toString();
    }
    const parsed = insertTourSchema.safeParse(tourData);
    if (!parsed.success) {
      console.error("Tour validation error:", JSON.stringify(parsed.error));
      return res.status(400).json(parsed.error);
    }
    const tour = await storage.createTour(parsed.data);
    res.status(201).json(tour);
  });
  app2.patch("/api/tours/:id", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).send("Admin access required");
    }
    const tourData = { ...req.body };
    console.log("Tour update request data:", JSON.stringify(tourData));
    if (typeof tourData.price === "number") {
      tourData.price = tourData.price.toString();
    }
    if (typeof tourData.rating === "number") {
      tourData.rating = tourData.rating.toString();
    }
    const parsed = insertTourSchema.safeParse(tourData);
    if (!parsed.success) {
      console.error("Tour validation error:", JSON.stringify(parsed.error));
      return res.status(400).json(parsed.error);
    }
    const tour = await storage.updateTour(parseInt(req.params.id), parsed.data);
    if (!tour) {
      return res.status(404).send("Tour not found");
    }
    res.json(tour);
  });
  app2.delete("/api/tours/:id", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).send("Admin access required");
    }
    await storage.deleteTour(parseInt(req.params.id));
    res.sendStatus(204);
  });

  // FIXED: Booking route that uses raw SQL - no more user_id errors!
  app2.post("/api/bookings", async (req, res) => {
    try {
      console.log("Raw booking request received:", JSON.stringify(req.body));

      // Validate only the essential required fields
      if (!req.body.startDate || !req.body.endDate || !req.body.departureCity || 
          !req.body.adults || !req.body.contactDetails) {
        return res.status(400).json({ error: "Missing required booking fields" });
      }

      // Convert and validate dates properly
      let startDate, endDate;
      try {
        startDate = new Date(req.body.startDate);
        endDate = new Date(req.body.endDate);
        
        // Check if dates are valid
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error("Invalid date format");
        }
        
        // Convert to YYYY-MM-DD format
        startDate = startDate.toISOString().split('T')[0];
        endDate = endDate.toISOString().split('T')[0];
        
        console.log("Converted dates:", { startDate, endDate });
      } catch (error) {
        console.error("Date conversion error:", error);
        return res.status(400).json({ error: "Invalid date format provided" });
      }

      // Create clean booking data for raw SQL insertion
      const bookingData = {
        tourId: req.body.tourId || null,
        startDate: startDate,
        endDate: endDate,
        departureCity: req.body.departureCity,
        adults: parseInt(req.body.adults),
        children: parseInt(req.body.children) || 0,
        budget: req.body.budget ? parseFloat(req.body.budget) : null,
        currency: req.body.currency || null,
        accommodation: req.body.accommodation || null,
        contactDetails: req.body.contactDetails,
        status: "pending",
        days: req.body.days || null,
        type: req.body.type || null
      };

      console.log("Processed booking data for SQL:", JSON.stringify(bookingData));

      // Use the fixed createBooking method with raw SQL
      const booking = await storage.createBooking(bookingData);
      console.log("Booking created successfully:", JSON.stringify(booking));

      // Send email notification
      try {
        const emailHtml = generateBookingEmail(booking);
        console.log("Sending booking notification email to agency");
        const emailResult = await sendEmail({
          to: "agence.departtravel@gmail.com",
          subject: "New Booking Request",
          html: emailHtml
        });
        if (emailResult) {
          console.log("Booking email notification sent successfully");
        } else {
          console.error("Failed to send booking email notification");
        }
      } catch (emailError) {
        console.error("Error sending booking notification email:", emailError);
      }

      res.status(201).json(booking);
    } catch (error) {
      console.error("Booking creation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path from "path";
function log(message, source = "express") {
  const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", { hour12: true });
  console.log(`${timestamp} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  if (process.env.NODE_ENV === "development") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom"
    });
    app2.use(vite.ssrLoadModule);
    app2.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve("index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    app2.use(express.static(path.resolve("dist"), { index: false }));
    app2.use("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }
}
function serveStatic(app2) {
  app2.use("/assets", express.static(path.resolve("assets")));
  app2.use("/public", express.static(path.resolve("public")));
  app2.use(express.static(path.resolve("public")));
  app2.use(express.static(path.resolve(".")));
  app2.use("*", (req, res) => {
    res.sendFile(path.resolve("index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: true }));
if (process.env.NODE_ENV === "production") {
  serveStatic(app);
} else {
  const httpServer = registerRoutes(app);
  const port = 3e3;
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
  setupVite(app, httpServer);
}
var server_default = app;
export {
  server_default as default
};