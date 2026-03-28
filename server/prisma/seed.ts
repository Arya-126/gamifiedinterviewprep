import * as admin from 'firebase-admin';
import bcrypt from 'bcryptjs';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Check if running in dev mode
const isDev = process.env.NODE_ENV !== 'production';
let serviceAccountKey;

if (isDev) {
  const keyPath = path.join(__dirname, '../../serviceAccountKey.json');
  if (fs.existsSync(keyPath)) {
    serviceAccountKey = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch (error) {
      console.error('❌ Invalid FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
      process.exit(1);
    }
  }
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } catch (error) {
    console.error('❌ Invalid FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
    process.exit(1);
  }
}

if (!serviceAccountKey) {
  console.error('❌ No Firebase credentials found. Set up serviceAccountKey.json or FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create subjects and topics
    const subjects = ['Physics', 'Chemistry', 'Maths'];
    const topicMap: { [key: string]: string[] } = {
      Physics: ['Mechanics', 'Thermodynamics', 'Waves', 'Electricity', 'Magnetism', 'Optics', 'Modern Physics', 'Atomic Structure', 'Nuclear Physics', 'Motion'],
      Chemistry: ['Atomic Structure', 'Bonding', 'States of Matter', 'Thermochemistry', 'Equilibrium', 'Redox', 'Electrochemistry', 'Coordination', 'Organic Basics', 'Periodic Table'],
      Maths: ['Algebra', 'Calculus', 'Geometry', 'Trigonometry', 'Vectors', 'Matrices', 'Probability', 'Statistics', 'Functions', 'Complex Numbers']
    };

    for (const subject of subjects) {
      const topics = topicMap[subject];
      for (const topicName of topics) {
        const subtopic = `${topicName} Level 1`;
        const topicId = `${subject.toLowerCase()}_${topicName.toLowerCase().replace(/\s+/g, '_')}`;
        
        // Check if topic exists
        const topicSnapshot = await db.ref(`topics/${topicId}`).once('value');
        
        if (!topicSnapshot.exists()) {
          // Create topic
          await db.ref(`topics/${topicId}`).set({
            id: topicId,
            subject,
            topic: topicName,
            subtopic,
            difficulty: 1,
            isActive: true,
            createdAt: new Date().toISOString()
          });

          // Create 10 sample questions for each topic
          const questions: { [key: string]: any } = {};
          for (let i = 1; i <= 10; i++) {
            const difficulty = i <= 4 ? 1 : i <= 8 ? 2 : 3; // 40% easy, 40% medium, 20% hard
            const questionId = `${topicId}_q${i}`;
            questions[questionId] = {
              id: questionId,
              topicId,
              questionText: `Sample question ${i} about ${topicName}: What is the definition?`,
              options: ['Option A', 'Option B', 'Option C', 'Option D'],
              correctAnswer: 'Option A',
              explanation: `This is the explanation for question ${i}. ${topicName} is important because...`,
              difficulty,
              type: 'MCQ',
              isAiGenerated: false,
              isApproved: true,
              createdAt: new Date().toISOString()
            };
          }

          await db.ref('questions').update(questions);

          console.log(`✅ Created topic: ${subject} > ${topicName} with 10 questions`);
        }
      }
    }

    // Create test users with Firebase Auth
    const hashedPassword = await bcrypt.hash('password', 10);
    
    const testUsers = [
      { name: 'Test Student', email: 'student@example.com', role: 'STUDENT' },
      { name: 'College Student', email: 'college@example.com', role: 'COLLEGE_STUDENT' },
      { name: 'Test Educator', email: 'educator@example.com', role: 'EDUCATOR' }
    ];

    const auth = admin.auth();

    for (const userData of testUsers) {
      const userEmail = userData.email;
      const userId = `user_${userEmail.split('@')[0]}`;

      // Check if user already exists in database
      const userSnapshot = await db.ref(`users/${userId}`).once('value');
      
      if (!userSnapshot.exists()) {
        try {
          // Try to create Firebase Auth user
          await auth.createUser({
            email: userEmail,
            password: 'password',
            displayName: userData.name
          });
          console.log(`✅ Created Firebase Auth user: ${userEmail}`);
        } catch (error: any) {
          if (error.code !== 'auth/email-already-exists') {
            console.warn(`⚠️  Could not create Firebase Auth user ${userEmail}:`, error.message);
          }
        }

        // Create user record in database
        await db.ref(`users/${userId}`).set({
          id: userId,
          name: userData.name,
          email: userEmail,
          passwordHash: hashedPassword,
          role: userData.role,
          level: 1,
          xpTotal: 0,
          streakDays: 0,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        });

        console.log(`✅ Created database user: ${userData.name} (${userData.role})`);
      }
    }

    console.log('🎉 Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
