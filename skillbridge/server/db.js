const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'skillbridge.db');
const db = new Database(dbPath);

// Enable WAL mode and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student','tutor','both','buyer')),
      is_student INTEGER NOT NULL DEFAULT 0,
      institution TEXT NOT NULL,
      programme TEXT,
      year_of_study INTEGER,
      bio TEXT,
      profile_photo_url TEXT,
      wallet_balance REAL NOT NULL DEFAULT 0,
      earnings_balance REAL NOT NULL DEFAULT 0,
      is_verified INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_admin INTEGER NOT NULL DEFAULT 0,
      account_type TEXT NOT NULL DEFAULT 'student' CHECK(account_type IN ('student','external')),
      access_fee_paid INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS skills (
      skill_id TEXT PRIMARY KEY,
      skill_name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session_listings (
      listing_id TEXT PRIMARY KEY,
      tutor_id TEXT NOT NULL REFERENCES users(user_id),
      skill_id TEXT NOT NULL REFERENCES skills(skill_id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      hourly_rate REAL NOT NULL,
      delivery_format TEXT NOT NULL CHECK(delivery_format IN ('online','in_person','both')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','archived')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS availability (
      availability_id TEXT PRIMARY KEY,
      tutor_id TEXT NOT NULL REFERENCES users(user_id),
      day_of_week TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      is_booked INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS bookings (
      booking_id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES users(user_id),
      tutor_id TEXT NOT NULL REFERENCES users(user_id),
      listing_id TEXT NOT NULL REFERENCES session_listings(listing_id),
      availability_id TEXT NOT NULL REFERENCES availability(availability_id),
      scheduled_date TEXT NOT NULL,
      delivery_format TEXT NOT NULL,
      learning_objectives TEXT,
      session_fee REAL NOT NULL,
      platform_commission REAL NOT NULL,
      tutor_earnings REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','confirmed','in_progress','completed','rated','cancelled')),
      online_link TEXT,
      requested_at TEXT NOT NULL,
      confirmed_at TEXT,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      transaction_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(user_id),
      booking_id TEXT REFERENCES bookings(booking_id),
      transaction_type TEXT NOT NULL CHECK(transaction_type IN ('top_up','session_payment','commission','tutor_earnings','refund','withdrawal','service_payment','service_escrow','service_earnings','service_commission','access_fee')),
      amount REAL NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('credit','debit')),
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('pending','completed','failed')),
      payment_reference TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      review_id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(booking_id),
      student_id TEXT NOT NULL REFERENCES users(user_id),
      tutor_id TEXT NOT NULL REFERENCES users(user_id),
      star_rating INTEGER NOT NULL CHECK(star_rating BETWEEN 1 AND 5),
      review_text TEXT,
      is_flagged INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS skill_requests (
      request_id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES users(user_id),
      skill_name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','declined','awaiting_tutors')),
      reviewed_by TEXT REFERENCES users(user_id),
      submitted_at TEXT NOT NULL,
      reviewed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      message_id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(booking_id),
      sender_id TEXT NOT NULL REFERENCES users(user_id),
      message_text TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      ticket_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Service Marketplace Tables

    CREATE TABLE IF NOT EXISTS service_categories (
      category_id TEXT PRIMARY KEY,
      category_name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_category_requests (
      request_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(user_id),
      category_name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','declined')),
      reviewed_by TEXT REFERENCES users(user_id),
      submitted_at TEXT NOT NULL,
      reviewed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS service_gigs (
      gig_id TEXT PRIMARY KEY,
      freelancer_id TEXT NOT NULL REFERENCES users(user_id),
      category_id TEXT NOT NULL REFERENCES service_categories(category_id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      min_price REAL NOT NULL,
      max_price REAL NOT NULL,
      delivery_time TEXT,
      delivery_format TEXT NOT NULL DEFAULT 'remote' CHECK(delivery_format IN ('remote','in_person','both')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','archived')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_requests (
      request_id TEXT PRIMARY KEY,
      buyer_id TEXT NOT NULL REFERENCES users(user_id),
      category_id TEXT REFERENCES service_categories(category_id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      budget_min REAL,
      budget_max REAL,
      deadline TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','completed','cancelled')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_request_applications (
      application_id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL REFERENCES service_requests(request_id),
      freelancer_id TEXT NOT NULL REFERENCES users(user_id),
      cover_message TEXT NOT NULL,
      proposed_price REAL NOT NULL,
      proposed_timeline TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_orders (
      order_id TEXT PRIMARY KEY,
      gig_id TEXT REFERENCES service_gigs(gig_id),
      request_id TEXT REFERENCES service_requests(request_id),
      buyer_id TEXT NOT NULL REFERENCES users(user_id),
      freelancer_id TEXT NOT NULL REFERENCES users(user_id),
      agreed_price REAL NOT NULL,
      platform_commission REAL NOT NULL,
      freelancer_earnings REAL NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','delivered','completed','cancelled','disputed')),
      escrow_status TEXT NOT NULL DEFAULT 'held' CHECK(escrow_status IN ('held','released','refunded')),
      buyer_confirmed INTEGER NOT NULL DEFAULT 0,
      freelancer_confirmed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      delivered_at TEXT,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS service_messages (
      message_id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL REFERENCES users(user_id),
      receiver_id TEXT NOT NULL REFERENCES users(user_id),
      gig_id TEXT REFERENCES service_gigs(gig_id),
      request_id TEXT REFERENCES service_requests(request_id),
      order_id TEXT REFERENCES service_orders(order_id),
      message_text TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS service_reviews (
      review_id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES service_orders(order_id),
      reviewer_id TEXT NOT NULL REFERENCES users(user_id),
      reviewee_id TEXT NOT NULL REFERENCES users(user_id),
      star_rating INTEGER NOT NULL CHECK(star_rating BETWEEN 1 AND 5),
      review_text TEXT,
      is_flagged INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);
}

function seedDatabase() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count > 0) return;

  console.log('Seeding database with sample data...');

  const now = new Date().toISOString();
  const hashPassword = (pw) => bcrypt.hashSync(pw, 10);

  // ---- SKILLS ----
  const skillsList = [
    { name: 'Python Programming', category: 'Programming' },
    { name: 'Web Development (HTML, CSS, JavaScript)', category: 'Programming' },
    { name: 'Data Analysis (Microsoft Excel, Power BI, Google Sheets)', category: 'Data' },
    { name: 'Graphic Design (Canva, Adobe Photoshop, Figma)', category: 'Design' },
    { name: 'Database Design and SQL', category: 'Programming' },
    { name: 'Video Editing (Adobe Premiere Pro, CapCut)', category: 'Media' },
    { name: 'Photography Editing (Adobe Lightroom, Adobe Photoshop)', category: 'Media' },
    { name: 'Cybersecurity Fundamentals', category: 'Security' },
    { name: 'Mobile Application Development', category: 'Programming' },
  ];

  const skillIds = {};
  const insertSkill = db.prepare('INSERT INTO skills (skill_id, skill_name, category, is_active, created_at) VALUES (?, ?, ?, 1, ?)');
  for (const skill of skillsList) {
    const id = uuidv4();
    skillIds[skill.name] = id;
    insertSkill.run(id, skill.name, skill.category, now);
  }

  // ---- SERVICE CATEGORIES ----
  const serviceCategories = [
    { name: 'Web & App Development', description: 'Websites, web apps, mobile apps, APIs' },
    { name: 'Graphic Design & Branding', description: 'Logos, flyers, social media graphics, brand identity' },
    { name: 'Video Editing & Motion Graphics', description: 'Video editing, animations, intros, reels' },
    { name: 'Data Analysis & Visualization', description: 'Excel, Power BI, data cleaning, dashboards' },
    { name: 'Academic Writing & Research', description: 'Research assistance, thesis formatting, citations' },
    { name: 'Photography & Photo Editing', description: 'Photo shoots, retouching, color grading' },
    { name: 'Social Media Management', description: 'Content creation, scheduling, analytics' },
    { name: 'Cybersecurity Services', description: 'Security audits, vulnerability assessments' },
    { name: 'Database & Backend Services', description: 'Database design, API development, server setup' },
  ];

  const insertCategory = db.prepare('INSERT INTO service_categories (category_id, category_name, description, is_active, created_at) VALUES (?, ?, ?, 1, ?)');
  const categoryIds = {};
  for (const cat of serviceCategories) {
    const id = uuidv4();
    categoryIds[cat.name] = id;
    insertCategory.run(id, cat.name, cat.description, now);
  }

  // ---- ADMIN ----
  const adminId = uuidv4();
  db.prepare(`INSERT INTO users (user_id, full_name, email, password_hash, role, is_student, institution, programme, bio, wallet_balance, earnings_balance, is_verified, is_active, is_admin, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    adminId, 'Platform Admin', 'admin@skillbridge.gh', hashPassword('admin123'),
    'student', 1, 'SkillBridge HQ', 'Administration', 'Platform administrator', 0, 0, 1, 1, 1, now
  );

  // ---- TUTORS ----
  const tutors = [
    { name: 'Kobena Adjei', email: 'kobena@ug.edu.gh', institution: 'University of Ghana', programme: 'Computer Science', year: 3, skill: 'Python Programming', rate: 60, bio: 'Passionate Python developer with 3 years of experience. I specialize in data structures, algorithms, and automation scripts. Love teaching beginners!', sessions: 34, photo: null },
    { name: 'Efanam Amedzro', email: 'efanam@knust.edu.gh', institution: 'KNUST', programme: 'Communication Design', year: 4, skill: 'Graphic Design (Canva, Adobe Photoshop, Figma)', rate: 45, bio: 'Creative graphic designer experienced in brand identity, social media graphics, and UI design. I make complex design concepts simple and fun.', sessions: 51, photo: null },
    { name: 'Kojo Lamptey', email: 'kojo@ashesi.edu.gh', institution: 'Ashesi University', programme: 'Computer Science', year: 3, skill: 'Web Development (HTML, CSS, JavaScript)', rate: 70, bio: 'Full-stack web developer who has built multiple production websites. I teach HTML, CSS, JavaScript, and React from scratch.', sessions: 28, photo: null },
    { name: 'Afia Asante', email: 'afia@ucc.edu.gh', institution: 'University of Cape Coast', programme: 'Statistics', year: 2, skill: 'Data Analysis (Microsoft Excel, Power BI, Google Sheets)', rate: 55, bio: 'Data enthusiast skilled in Excel, Power BI dashboards, and Google Sheets automation. I help students ace their data assignments.', sessions: 19, photo: null },
    { name: 'Wunpini Dawuni', email: 'wunpini@gimpa.edu.gh', institution: 'GIMPA', programme: 'Information Technology', year: 4, skill: 'Cybersecurity Fundamentals', rate: 80, bio: 'Certified in CompTIA Security+. I teach network security, ethical hacking basics, and cybersecurity frameworks in an easy-to-understand way.', sessions: 22, photo: null },
    { name: 'Ekua Gyan', email: 'ekua@knust.edu.gh', institution: 'KNUST', programme: 'Fine Art', year: 3, skill: 'Photography Editing (Adobe Lightroom, Adobe Photoshop)', rate: 40, bio: 'Professional photographer and editor. I teach color grading, retouching, and creative editing techniques using Lightroom and Photoshop.', sessions: 15, photo: null },
    { name: 'Yao Quartey', email: 'yao@ashesi.edu.gh', institution: 'Ashesi University', programme: 'Computer Engineering', year: 4, skill: 'Mobile Application Development', rate: 75, bio: 'Mobile app developer with published apps on Google Play. I teach React Native and Flutter for cross-platform development.', sessions: 30, photo: null },
    { name: 'Abena Yeboah', email: 'abena@ug.edu.gh', institution: 'University of Ghana', programme: 'Information Studies', year: 3, skill: 'Database Design and SQL', rate: 65, bio: 'Database specialist experienced in MySQL, PostgreSQL, and SQLite. I teach relational database design, normalization, and complex SQL queries.', sessions: 24, photo: null },
    { name: 'Naomi Agyemang', email: 'naomi@ashesi.edu.gh', institution: 'Ashesi University', programme: 'Computer Science', year: 4, skill: 'Python Programming', rate: 55, bio: 'Python enthusiast with experience in Django, Flask, and data science libraries. I also teach web development with JavaScript and React. I love helping students build real projects!', sessions: 38, photo: null, extraSkills: ['Web Development (HTML, CSS, JavaScript)'] },
    { name: 'Kwadwo Adu-Gyamfi', email: 'kwadwo@ug.edu.gh', institution: 'University of Ghana', programme: 'Computer Engineering', year: 3, skill: 'Mobile Application Development', rate: 70, bio: 'Mobile and web developer with published apps on the Play Store. I teach Flutter, React Native, and also full-stack JavaScript development.', sessions: 27, photo: null, extraSkills: ['Web Development (HTML, CSS, JavaScript)', 'Database Design and SQL'] },
    { name: 'Dagbe Tetteh', email: 'dagbe@knust.edu.gh', institution: 'KNUST', programme: 'Multimedia Art', year: 4, skill: 'Graphic Design (Canva, Adobe Photoshop, Figma)', rate: 50, bio: 'Award-winning graphic designer and video editor. I teach everything from branding to motion graphics. My students leave with portfolio-ready work.', sessions: 42, photo: null, extraSkills: ['Video Editing (Adobe Premiere Pro, CapCut)', 'Photography Editing (Adobe Lightroom, Adobe Photoshop)'] },
    { name: 'Azma Mahama', email: 'azma@gimpa.edu.gh', institution: 'GIMPA', programme: 'Information Technology', year: 3, skill: 'Cybersecurity Fundamentals', rate: 85, bio: 'Cybersecurity specialist and data analyst. I teach network security, ethical hacking, and also advanced data analysis with Excel, Power BI, and Python.', sessions: 31, photo: null, extraSkills: ['Data Analysis (Microsoft Excel, Power BI, Google Sheets)', 'Python Programming'] },
  ];

  const insertUser = db.prepare(`INSERT INTO users (user_id, full_name, email, password_hash, role, is_student, institution, programme, year_of_study, bio, profile_photo_url, wallet_balance, earnings_balance, is_verified, is_active, is_admin, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertListing = db.prepare(`INSERT INTO session_listings (listing_id, tutor_id, skill_id, title, description, hourly_rate, delivery_format, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertAvailability = db.prepare(`INSERT INTO availability (availability_id, tutor_id, day_of_week, start_time, end_time, is_booked)
    VALUES (?, ?, ?, ?, ?, ?)`);

  const tutorIds = [];
  const listingIds = [];
  const availabilityIds = [];

  for (const tutor of tutors) {
    const tutorId = uuidv4();
    tutorIds.push(tutorId);
    const earnings = tutor.rate * tutor.sessions * 0.9;
    insertUser.run(tutorId, tutor.name, tutor.email, hashPassword('password123'), 'tutor', 1, tutor.institution, tutor.programme, tutor.year, tutor.bio, tutor.photo, 0, Math.round(earnings * 0.1), 1, 1, 0, now);

    // Primary listing
    const listingId = uuidv4();
    listingIds.push(listingId);
    insertListing.run(listingId, tutorId, skillIds[tutor.skill], `${tutor.skill.split('(')[0].trim()} Tutoring`, `One-on-one ${tutor.skill} tutoring session. ${tutor.bio}`, tutor.rate, 'both', 'active', now, now);

    // Additional skill listings for multi-skill tutors
    if (tutor.extraSkills) {
      for (const extraSkill of tutor.extraSkills) {
        const extraListingId = uuidv4();
        insertListing.run(extraListingId, tutorId, skillIds[extraSkill], `${extraSkill.split('(')[0].trim()} Tutoring`, `One-on-one ${extraSkill} tutoring session. ${tutor.bio}`, tutor.rate, 'both', 'active', now, now);
      }
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const times = [['09:00', '10:00'], ['10:00', '11:00'], ['14:00', '15:00'], ['15:00', '16:00']];
    for (const day of days) {
      for (const [start, end] of times) {
        const avId = uuidv4();
        availabilityIds.push(avId);
        insertAvailability.run(avId, tutorId, day, start, end, 0);
      }
    }
  }

  // ---- STUDENTS ----
  const students = [
    { name: 'Kwamina Koomson', email: 'kwamina@ug.edu.gh', institution: 'University of Ghana', programme: 'Business Administration', year: 2, wallet: 120.00 },
    { name: 'Pagnaa Ziblim', email: 'pagnaa@knust.edu.gh', institution: 'KNUST', programme: 'Electrical Engineering', year: 1, wallet: 85.00 },
    { name: 'Kweku Osei', email: 'kweku@ashesi.edu.gh', institution: 'Ashesi University', programme: 'Management Information Systems', year: 3, wallet: 200.00 },
    { name: 'Nasara Alheri', email: 'nasara@ucc.edu.gh', institution: 'University of Cape Coast', programme: 'Education', year: 2, wallet: 50.00 },
    { name: 'Agbeko Gbeho', email: 'agbeko@gimpa.edu.gh', institution: 'GIMPA', programme: 'Marketing', year: 1, wallet: 0.00 },
    { name: 'Ajua Nii-Lante', email: 'ajua@ug.edu.gh', institution: 'University of Ghana', programme: 'Information Technology', year: 2, wallet: 150.00 },
    { name: 'Kudzo Amegah', email: 'kudzo@ashesi.edu.gh', institution: 'Ashesi University', programme: 'Engineering', year: 1, wallet: 75.00 },
    { name: 'Akua Amarteifio', email: 'akua@knust.edu.gh', institution: 'KNUST', programme: 'Computer Science', year: 3, wallet: 220.00 },
    { name: 'Jilima Suhuyini', email: 'jilima@ucc.edu.gh', institution: 'University of Cape Coast', programme: 'Mathematics', year: 2, wallet: 40.00 },
  ];

  const studentIds = [];
  for (const student of students) {
    const studentId = uuidv4();
    studentIds.push(studentId);
    insertUser.run(studentId, student.name, student.email, hashPassword('password123'), 'student', 1, student.institution, student.programme, student.year, null, null, student.wallet, 0, 1, 1, 0, now);
  }

  // ---- DEMO BUYERS (non-student external clients) ----
  const buyers = [
    { name: 'Sarah Mensah', email: 'sarah.client@demo.com', wallet: 500.00 },
    { name: 'Daniel Owusu', email: 'daniel.client@demo.com', wallet: 350.00 },
  ];
  const buyerIds = [];
  for (const buyer of buyers) {
    const buyerId = uuidv4();
    buyerIds.push(buyerId);
    insertUser.run(buyerId, buyer.name, buyer.email, hashPassword('demo123'), 'buyer', 0, null, null, null, null, null, buyer.wallet, 0, 1, 1, 0, now);
  }

  // ---- SAMPLE BOOKINGS & REVIEWS ----
  const insertBooking = db.prepare(`INSERT INTO bookings (booking_id, student_id, tutor_id, listing_id, availability_id, scheduled_date, delivery_format, learning_objectives, session_fee, platform_commission, tutor_earnings, status, online_link, requested_at, confirmed_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertTransaction = db.prepare(`INSERT INTO transactions (transaction_id, user_id, booking_id, transaction_type, amount, direction, status, payment_reference, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertReview = db.prepare(`INSERT INTO reviews (review_id, booking_id, student_id, tutor_id, star_rating, review_text, is_flagged, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

  const reviewTexts = [
    'Excellent tutor! Very patient and explained everything clearly. Highly recommended.',
    'Great session, I learned a lot. Will definitely book again.',
    'Very knowledgeable and professional. Made the topic easy to understand.',
    'Amazing teaching style. Broke down complex concepts into simple steps.',
    'Good session overall. The tutor was well-prepared and helpful.',
    'Fantastic experience! I went from confused to confident in just one session.',
    'Really helpful and encouraging. Perfect for beginners.',
    'Thorough and detailed explanations. Worth every cedi.',
  ];

  const pastDates = [
    '2025-12-01', '2025-12-05', '2025-12-10', '2025-12-15',
    '2026-01-05', '2026-01-10', '2026-01-15', '2026-01-20',
    '2026-02-01', '2026-02-10', '2026-02-15', '2026-02-20',
    '2026-03-01', '2026-03-05',
  ];

  let avIdx = 0;
  // Create completed bookings with reviews
  for (let i = 0; i < 8; i++) {
    const studentIdx = i % studentIds.length;
    const tutorIdx = i % tutorIds.length;
    const rate = tutors[tutorIdx].rate;
    const commission = rate * 0.10;
    const earnings = rate * 0.90;
    const bookingId = uuidv4();
    const dateIdx = i % pastDates.length;

    insertBooking.run(
      bookingId, studentIds[studentIdx], tutorIds[tutorIdx], listingIds[tutorIdx],
      availabilityIds[avIdx % availabilityIds.length],
      pastDates[dateIdx], 'online', 'Learn the fundamentals and practice exercises',
      rate, commission, earnings, 'completed', 'https://meet.google.com/abc-defg-hij',
      pastDates[dateIdx] + 'T08:00:00Z', pastDates[dateIdx] + 'T08:30:00Z', pastDates[dateIdx] + 'T10:00:00Z'
    );

    // Transactions for this booking
    insertTransaction.run(uuidv4(), studentIds[studentIdx], bookingId, 'session_payment', rate, 'debit', 'completed', `PAY-${bookingId.slice(0, 8)}`, pastDates[dateIdx] + 'T08:00:00Z');
    insertTransaction.run(uuidv4(), tutorIds[tutorIdx], bookingId, 'tutor_earnings', earnings, 'credit', 'completed', `EARN-${bookingId.slice(0, 8)}`, pastDates[dateIdx] + 'T10:00:00Z');
    insertTransaction.run(uuidv4(), adminId, bookingId, 'commission', commission, 'credit', 'completed', `COM-${bookingId.slice(0, 8)}`, pastDates[dateIdx] + 'T10:00:00Z');

    // Review
    const stars = [5, 5, 4, 5, 4, 5, 5, 4][i];
    insertReview.run(uuidv4(), bookingId, studentIds[studentIdx], tutorIds[tutorIdx], stars, reviewTexts[i], 0, pastDates[dateIdx] + 'T11:00:00Z');

    avIdx++;
  }

  // Create some top-up transactions for students
  for (let i = 0; i < studentIds.length; i++) {
    if (students[i].wallet > 0) {
      insertTransaction.run(uuidv4(), studentIds[i], null, 'top_up', students[i].wallet + 100, 'credit', 'completed', `TOPUP-${uuidv4().slice(0, 8)}`, now);
    }
  }

  // Create some upcoming bookings
  const futureDates = ['2026-03-15', '2026-03-18', '2026-03-20'];
  for (let i = 0; i < 3; i++) {
    const studentIdx = i % studentIds.length;
    const tutorIdx = (i + 3) % tutorIds.length;
    const rate = tutors[tutorIdx].rate;
    const bookingId = uuidv4();

    insertBooking.run(
      bookingId, studentIds[studentIdx], tutorIds[tutorIdx], listingIds[tutorIdx],
      availabilityIds[(avIdx + i) % availabilityIds.length],
      futureDates[i], 'online', 'Prepare for upcoming exam',
      rate, rate * 0.10, rate * 0.90, i === 0 ? 'confirmed' : 'requested',
      null, now, i === 0 ? now : null, null
    );
  }

  // Add skill request samples
  db.prepare(`INSERT INTO skill_requests (request_id, student_id, skill_name, description, status, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?)`).run(uuidv4(), studentIds[0], 'Machine Learning with Python', 'I need help with ML algorithms and scikit-learn', 'pending', now);
  db.prepare(`INSERT INTO skill_requests (request_id, student_id, skill_name, description, status, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?)`).run(uuidv4(), studentIds[1], 'Cloud Computing (AWS)', 'Want to learn AWS basics for my project', 'pending', now);

  // ---- SAMPLE SERVICE GIGS ----
  const insertGig = db.prepare(`INSERT INTO service_gigs (gig_id, freelancer_id, category_id, title, description, min_price, max_price, delivery_time, delivery_format, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`);

  const sampleGigs = [
    { tutorIdx: 2, cat: 'Web & App Development', title: 'Build a responsive portfolio website', desc: 'I will build you a modern, responsive portfolio website using React, HTML, CSS, and JavaScript. Includes mobile optimization and SEO basics.', min: 200, max: 500, time: '3-5 days', format: 'remote' },
    { tutorIdx: 1, cat: 'Graphic Design & Branding', title: 'Design your event flyer or poster', desc: 'Professional event flyer, poster, or social media graphic designed in Canva or Figma. Includes 2 revisions.', min: 30, max: 80, time: '1-2 days', format: 'remote' },
    { tutorIdx: 5, cat: 'Photography & Photo Editing', title: 'Professional photo retouching & color grading', desc: 'I will retouch and color grade your photos using Adobe Lightroom and Photoshop. Perfect for portraits, events, and product shots.', min: 20, max: 60, time: '1-2 days', format: 'remote' },
    { tutorIdx: 6, cat: 'Web & App Development', title: 'Build a cross-platform mobile app', desc: 'I will develop a mobile app for your business or project using React Native. Includes both iOS and Android builds.', min: 500, max: 1500, time: '1-3 weeks', format: 'remote' },
    { tutorIdx: 3, cat: 'Data Analysis & Visualization', title: 'Create a Power BI dashboard for your data', desc: 'I will create interactive Power BI dashboards from your data. Includes data cleaning, modeling, and visual design.', min: 100, max: 300, time: '2-4 days', format: 'remote' },
    { tutorIdx: 7, cat: 'Database & Backend Services', title: 'Design and build your database', desc: 'Complete database design and implementation in MySQL, PostgreSQL, or SQLite. Includes schema design, normalization, and sample queries.', min: 150, max: 400, time: '2-5 days', format: 'remote' },
  ];

  for (const gig of sampleGigs) {
    insertGig.run(uuidv4(), tutorIds[gig.tutorIdx], categoryIds[gig.cat], gig.title, gig.desc, gig.min, gig.max, gig.time, gig.format, now, now);
  }

  // ---- SAMPLE SERVICE REQUESTS (buyer ads) ----
  const insertServiceRequest = db.prepare(`INSERT INTO service_requests (request_id, buyer_id, category_id, title, description, budget_min, budget_max, deadline, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`);

  const sampleRequests = [
    { studentIdx: 0, cat: 'Web & App Development', title: 'Need a website for my small business', desc: 'Looking for someone to build a simple e-commerce website for my clothing business. Should have product listings, cart, and mobile money payment integration.', min: 300, max: 800, deadline: '2026-04-15' },
    { studentIdx: 1, cat: 'Video Editing & Motion Graphics', title: 'Edit my YouTube video (10 minutes)', desc: 'I have raw footage for a 10-minute YouTube video. Need professional editing with transitions, text overlays, and background music.', min: 50, max: 150, deadline: '2026-03-25' },
    { studentIdx: 2, cat: 'Graphic Design & Branding', title: 'Logo and brand identity for my startup', desc: 'Need a complete brand identity package: logo, color palette, typography, and business card design for my tech startup.', min: 100, max: 250, deadline: '2026-04-01' },
  ];

  for (const req of sampleRequests) {
    insertServiceRequest.run(uuidv4(), studentIds[req.studentIdx], categoryIds[req.cat], req.title, req.desc, req.min, req.max, req.deadline, now, now);
  }

  // ---- SAMPLE SERVICE ORDERS (completed with reviews) ----
  const gigIds = db.prepare('SELECT gig_id, freelancer_id, min_price, title FROM service_gigs').all();
  const insertServiceOrder = db.prepare(`INSERT INTO service_orders (order_id, gig_id, request_id, buyer_id, freelancer_id, agreed_price, platform_commission, freelancer_earnings, description, status, escrow_status, buyer_confirmed, freelancer_confirmed, created_at, delivered_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertServiceReview = db.prepare(`INSERT INTO service_reviews (review_id, order_id, reviewer_id, reviewee_id, star_rating, review_text, is_flagged, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)`);
  const insertServiceMessage = db.prepare(`INSERT INTO service_messages (message_id, sender_id, receiver_id, gig_id, request_id, order_id, message_text, sent_at, is_read)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`);

  const serviceReviewTexts = [
    'Delivered exactly what I asked for. Very professional and fast!',
    'Great work! The quality exceeded my expectations. Will hire again.',
    'Solid freelancer. Communication was clear and delivery was on time.',
    'Fantastic job! Very creative and responsive to feedback.',
    'Good work overall. Minor revisions needed but handled quickly.',
    'Absolutely brilliant! Went above and beyond what I expected.',
  ];

  const serviceOrderDates = ['2026-02-10', '2026-02-18', '2026-03-01', '2026-03-10', '2026-03-15', '2026-03-22'];

  for (let i = 0; i < Math.min(gigIds.length, 6); i++) {
    const gig = gigIds[i];
    const buyerIdx = i % studentIds.length;
    const price = gig.min_price + (i * 20);
    const commission = price * 0.10;
    const earnings = price * 0.90;
    const orderId = uuidv4();
    const orderDate = serviceOrderDates[i];

    // Completed order
    insertServiceOrder.run(
      orderId, gig.gig_id, null, studentIds[buyerIdx], gig.freelancer_id,
      price, commission, earnings,
      `I need ${gig.title.toLowerCase()} for my university project.`,
      i < 4 ? 'completed' : (i === 4 ? 'delivered' : 'in_progress'),
      i < 4 ? 'released' : 'held',
      i < 4 ? 1 : 0, i < 5 ? 1 : 0,
      orderDate + 'T09:00:00Z',
      i < 5 ? orderDate + 'T18:00:00Z' : null,
      i < 4 ? orderDate + 'T20:00:00Z' : null
    );

    // Transactions for completed orders
    if (i < 4) {
      insertTransaction.run(uuidv4(), studentIds[buyerIdx], null, 'service_payment', price, 'debit', 'completed', `SVC-${orderId.slice(0, 8)}`, orderDate + 'T09:00:00Z');
      insertTransaction.run(uuidv4(), gig.freelancer_id, null, 'service_earnings', earnings, 'credit', 'completed', `SVCERN-${orderId.slice(0, 8)}`, orderDate + 'T20:00:00Z');
      insertTransaction.run(uuidv4(), adminId, null, 'service_commission', commission, 'credit', 'completed', `SVCCOM-${orderId.slice(0, 8)}`, orderDate + 'T20:00:00Z');
    }

    // Reviews for completed orders (buyer reviews freelancer)
    if (i < 4) {
      const stars = [5, 4, 5, 5][i];
      insertServiceReview.run(uuidv4(), orderId, studentIds[buyerIdx], gig.freelancer_id, stars, serviceReviewTexts[i], orderDate + 'T21:00:00Z');
      // Freelancer reviews buyer
      insertServiceReview.run(uuidv4(), orderId, gig.freelancer_id, studentIds[buyerIdx], [5, 5, 4, 5][i],
        ['Great client! Clear instructions and quick payment.', 'Easy to work with. Would collaborate again.', 'Good communication throughout the project.', 'Wonderful client. Appreciated my work!'][i],
        orderDate + 'T22:00:00Z');
    }

    // Service messages for all orders
    insertServiceMessage.run(uuidv4(), studentIds[buyerIdx], gig.freelancer_id, gig.gig_id, null, orderId,
      `Hi! I'm interested in your "${gig.title}" service. Can you help me with my project?`, orderDate + 'T08:00:00Z');
    insertServiceMessage.run(uuidv4(), gig.freelancer_id, studentIds[buyerIdx], gig.gig_id, null, orderId,
      `Hello! Yes, I'd be happy to help. Can you share more details about what you need?`, orderDate + 'T08:30:00Z');
    insertServiceMessage.run(uuidv4(), studentIds[buyerIdx], gig.freelancer_id, gig.gig_id, null, orderId,
      `Great! I'll place the order now. Looking forward to working with you.`, orderDate + 'T08:45:00Z');
  }

  // ---- SAMPLE SUPPORT TICKETS ----
  const insertTicket = db.prepare(`INSERT INTO support_tickets (ticket_id, name, email, subject, message, created_at) VALUES (?, ?, ?, ?, ?, ?)`);

  const sampleTickets = [
    { name: 'Kwamina Koomson', email: 'kwamina@ug.edu.gh', subject: 'Wallet top-up not reflecting', message: 'I topped up GHS 50 via MTN MoMo about 2 hours ago but the balance has not been updated. Transaction reference: TOPUP-2026-03-01. Please help.' },
    { name: 'Pagnaa Ziblim', email: 'pagnaa@knust.edu.gh', subject: 'Cannot book a tutoring session', message: 'When I try to book a session with Kojo Lamptey, I get an error saying insufficient balance, but I have GHS 85 in my wallet and the session costs GHS 70.' },
    { name: 'Kweku Osei', email: 'kweku@ashesi.edu.gh', subject: 'Request for refund on cancelled session', message: 'My tutor cancelled the session last minute but the GHS 80 has not been refunded to my wallet. Booking ID was for Python Programming on March 5.' },
    { name: 'Kobena Adjei', email: 'kobena@ug.edu.gh', subject: 'How to become a freelancer?', message: 'I am already registered as a tutor. How can I also offer freelance services on the marketplace? Do I need a separate account?' },
    { name: 'Nasara Alheri', email: 'nasara@ucc.edu.gh', subject: 'Report inappropriate review', message: 'A student left a review on my friend\'s profile that contains offensive language. Review was posted on March 3rd for a Graphic Design session. Please review and remove it.' },
    { name: 'Akua Amarteifio', email: 'akua@knust.edu.gh', subject: 'Feature request: Group tutoring sessions', message: 'It would be great if SkillBridge could support group tutoring sessions where multiple students can join and split the cost. Is this something being considered?' },
  ];

  const ticketDates = ['2026-03-01', '2026-03-05', '2026-03-08', '2026-03-12', '2026-03-18', '2026-03-25'];
  for (let i = 0; i < sampleTickets.length; i++) {
    const t = sampleTickets[i];
    insertTicket.run(uuidv4(), t.name, t.email, t.subject, t.message, ticketDates[i] + 'T10:00:00Z');
  }

  // ---- ADDITIONAL SESSION MESSAGES ----
  const insertMessage = db.prepare(`INSERT INTO messages (message_id, booking_id, sender_id, message_text, sent_at) VALUES (?, ?, ?, ?, ?)`);
  const completedBookings = db.prepare("SELECT booking_id, student_id, tutor_id FROM bookings WHERE status IN ('completed','rated') LIMIT 5").all();

  const sessionMsgTexts = [
    ['Hi! Looking forward to our session. Should I prepare anything?', 'Yes, please review chapters 3-4 before we meet. See you soon!'],
    ['Thanks for the session! Can we go over loops next time?', 'Of course! I\'ll prepare some exercises on loops and iteration for you.'],
    ['I really appreciated how you explained recursion. It finally clicked!', 'Glad to hear that! Feel free to reach out if you have more questions.'],
  ];

  for (let i = 0; i < Math.min(completedBookings.length, 3); i++) {
    const b = completedBookings[i];
    insertMessage.run(uuidv4(), b.booking_id, b.student_id, sessionMsgTexts[i][0], '2026-03-0' + (i + 1) + 'T09:00:00Z');
    insertMessage.run(uuidv4(), b.booking_id, b.tutor_id, sessionMsgTexts[i][1], '2026-03-0' + (i + 1) + 'T09:30:00Z');
  }

  console.log('Database seeded successfully!');
}

initializeDatabase();
seedDatabase();

module.exports = db;
