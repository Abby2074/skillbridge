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
      role TEXT NOT NULL CHECK(role IN ('student','tutor','both')),
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
      transaction_type TEXT NOT NULL CHECK(transaction_type IN ('top_up','session_payment','commission','tutor_earnings','refund','withdrawal')),
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

  // ---- ADMIN ----
  const adminId = uuidv4();
  db.prepare(`INSERT INTO users (user_id, full_name, email, password_hash, role, institution, programme, bio, wallet_balance, earnings_balance, is_verified, is_active, is_admin, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    adminId, 'Platform Admin', 'admin@skillbridge.gh', hashPassword('admin123'),
    'student', 'SkillBridge HQ', 'Administration', 'Platform administrator', 0, 0, 1, 1, 1, now
  );

  // ---- TUTORS ----
  const tutors = [
    { name: 'Kwame Asante', email: 'kwame@ug.edu.gh', institution: 'University of Ghana', programme: 'Computer Science', year: 3, skill: 'Python Programming', rate: 60, bio: 'Passionate Python developer with 3 years of experience. I specialize in data structures, algorithms, and automation scripts. Love teaching beginners!', sessions: 34, photo: null },
    { name: 'Abena Mensah', email: 'abena@knust.edu.gh', institution: 'KNUST', programme: 'Communication Design', year: 4, skill: 'Graphic Design (Canva, Adobe Photoshop, Figma)', rate: 45, bio: 'Creative graphic designer experienced in brand identity, social media graphics, and UI design. I make complex design concepts simple and fun.', sessions: 51, photo: null },
    { name: 'Kofi Boateng', email: 'kofi@ashesi.edu.gh', institution: 'Ashesi University', programme: 'Computer Science', year: 3, skill: 'Web Development (HTML, CSS, JavaScript)', rate: 70, bio: 'Full-stack web developer who has built multiple production websites. I teach HTML, CSS, JavaScript, and React from scratch.', sessions: 28, photo: null },
    { name: 'Ama Owusu', email: 'ama@ucc.edu.gh', institution: 'University of Cape Coast', programme: 'Statistics', year: 2, skill: 'Data Analysis (Microsoft Excel, Power BI, Google Sheets)', rate: 55, bio: 'Data enthusiast skilled in Excel, Power BI dashboards, and Google Sheets automation. I help students ace their data assignments.', sessions: 19, photo: null },
    { name: 'Yaw Darko', email: 'yaw@gimpa.edu.gh', institution: 'GIMPA', programme: 'Information Technology', year: 4, skill: 'Cybersecurity Fundamentals', rate: 80, bio: 'Certified in CompTIA Security+. I teach network security, ethical hacking basics, and cybersecurity frameworks in an easy-to-understand way.', sessions: 22, photo: null },
    { name: 'Efua Adjei', email: 'efua@knust.edu.gh', institution: 'KNUST', programme: 'Fine Art', year: 3, skill: 'Photography Editing (Adobe Lightroom, Adobe Photoshop)', rate: 40, bio: 'Professional photographer and editor. I teach color grading, retouching, and creative editing techniques using Lightroom and Photoshop.', sessions: 15, photo: null },
    { name: 'Nana Osei', email: 'nana@ashesi.edu.gh', institution: 'Ashesi University', programme: 'Computer Engineering', year: 4, skill: 'Mobile Application Development', rate: 75, bio: 'Mobile app developer with published apps on Google Play. I teach React Native and Flutter for cross-platform development.', sessions: 30, photo: null },
    { name: 'Akosua Frimpong', email: 'akosua@ug.edu.gh', institution: 'University of Ghana', programme: 'Information Studies', year: 3, skill: 'Database Design and SQL', rate: 65, bio: 'Database specialist experienced in MySQL, PostgreSQL, and SQLite. I teach relational database design, normalization, and complex SQL queries.', sessions: 24, photo: null },
    { name: 'Priscilla Agyemang', email: 'priscilla@ashesi.edu.gh', institution: 'Ashesi University', programme: 'Computer Science', year: 4, skill: 'Python Programming', rate: 55, bio: 'Python enthusiast with experience in Django, Flask, and data science libraries. I also teach web development with JavaScript and React. I love helping students build real projects!', sessions: 38, photo: null, extraSkills: ['Web Development (HTML, CSS, JavaScript)'] },
    { name: 'Samuel Adu-Gyamfi', email: 'samuel@ug.edu.gh', institution: 'University of Ghana', programme: 'Computer Engineering', year: 3, skill: 'Mobile Application Development', rate: 70, bio: 'Mobile and web developer with published apps on the Play Store. I teach Flutter, React Native, and also full-stack JavaScript development.', sessions: 27, photo: null, extraSkills: ['Web Development (HTML, CSS, JavaScript)', 'Database Design and SQL'] },
    { name: 'Mercy Tetteh', email: 'mercy@knust.edu.gh', institution: 'KNUST', programme: 'Multimedia Art', year: 4, skill: 'Graphic Design (Canva, Adobe Photoshop, Figma)', rate: 50, bio: 'Award-winning graphic designer and video editor. I teach everything from branding to motion graphics. My students leave with portfolio-ready work.', sessions: 42, photo: null, extraSkills: ['Video Editing (Adobe Premiere Pro, CapCut)', 'Photography Editing (Adobe Lightroom, Adobe Photoshop)'] },
    { name: 'Isaac Quaye', email: 'isaac@gimpa.edu.gh', institution: 'GIMPA', programme: 'Information Technology', year: 3, skill: 'Cybersecurity Fundamentals', rate: 85, bio: 'Cybersecurity specialist and data analyst. I teach network security, ethical hacking, and also advanced data analysis with Excel, Power BI, and Python.', sessions: 31, photo: null, extraSkills: ['Data Analysis (Microsoft Excel, Power BI, Google Sheets)', 'Python Programming'] },
  ];

  const insertUser = db.prepare(`INSERT INTO users (user_id, full_name, email, password_hash, role, institution, programme, year_of_study, bio, profile_photo_url, wallet_balance, earnings_balance, is_verified, is_active, is_admin, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
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
    insertUser.run(tutorId, tutor.name, tutor.email, hashPassword('password123'), 'tutor', tutor.institution, tutor.programme, tutor.year, tutor.bio, tutor.photo, 0, Math.round(earnings * 0.1), 1, 1, 0, now);

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
    { name: 'Emmanuel Tetteh', email: 'emmanuel@ug.edu.gh', institution: 'University of Ghana', programme: 'Business Administration', year: 2, wallet: 120.00 },
    { name: 'Adwoa Boadu', email: 'adwoa@knust.edu.gh', institution: 'KNUST', programme: 'Electrical Engineering', year: 1, wallet: 85.00 },
    { name: 'Kweku Mensah', email: 'kweku@ashesi.edu.gh', institution: 'Ashesi University', programme: 'Management Information Systems', year: 3, wallet: 200.00 },
    { name: 'Fatima Issah', email: 'fatima@ucc.edu.gh', institution: 'University of Cape Coast', programme: 'Education', year: 2, wallet: 50.00 },
    { name: 'Daniel Asare', email: 'daniel@gimpa.edu.gh', institution: 'GIMPA', programme: 'Marketing', year: 1, wallet: 0.00 },
    { name: 'Selina Ocansey', email: 'selina@ug.edu.gh', institution: 'University of Ghana', programme: 'Information Technology', year: 2, wallet: 150.00 },
    { name: 'Benjamin Appiah', email: 'benjamin@ashesi.edu.gh', institution: 'Ashesi University', programme: 'Engineering', year: 1, wallet: 75.00 },
    { name: 'Rita Mensah', email: 'rita@knust.edu.gh', institution: 'KNUST', programme: 'Computer Science', year: 3, wallet: 220.00 },
    { name: 'Michael Ofori', email: 'michael@ucc.edu.gh', institution: 'University of Cape Coast', programme: 'Mathematics', year: 2, wallet: 40.00 },
  ];

  const studentIds = [];
  for (const student of students) {
    const studentId = uuidv4();
    studentIds.push(studentId);
    insertUser.run(studentId, student.name, student.email, hashPassword('password123'), 'student', student.institution, student.programme, student.year, null, null, student.wallet, 0, 1, 1, 0, now);
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

  console.log('Database seeded successfully!');
}

initializeDatabase();
seedDatabase();

module.exports = db;
