const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const seedDir = path.join(__dirname, 'seed-data');

function readJson(filename) {
  const filePath = path.join(seedDir, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠ ${filename} not found, skipping...`);
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  // 1. Categories
  const categories = readJson('categories.json');
  if (categories.length > 0) {
    for (const cat of categories) {
      await prisma.category.upsert({
        where: { id: cat.id },
        update: { name: cat.name },
        create: { id: cat.id, name: cat.name }
      });
    }
    console.log(`✓ ${categories.length} categories seeded`);
  }

  // 2. Users
  const users = readJson('users.json');
  if (users.length > 0) {
    for (const user of users) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          username: user.username,
          email: user.email,
          password_hash: user.password_hash,
          role: user.role,
          total_play_count: user.total_play_count,
          total_questions_attempted: user.total_questions_attempted,
          total_correct_answers: user.total_correct_answers,
          total_score: user.total_score,
          created_at: new Date(user.created_at),
          updated_at: new Date(user.updated_at),
          last_login: user.last_login ? new Date(user.last_login) : null
        }
      });
    }
    console.log(`✓ ${users.length} users seeded`);
  }

  // 3. Questions
  const questions = readJson('questions.json');
  if (questions.length > 0) {
    for (const q of questions) {
      await prisma.question.upsert({
        where: { id: q.id },
        update: {},
        create: {
          id: q.id,
          category_id: q.category_id,
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_option: q.correct_option,
          created_at: new Date(q.created_at)
        }
      });
    }
    console.log(`✓ ${questions.length} questions seeded`);
  }

  // 4. Quizzes
  const quizzes = readJson('quizzes.json');
  if (quizzes.length > 0) {
    for (const quiz of quizzes) {
      await prisma.quiz.upsert({
        where: { id: quiz.id },
        update: {},
        create: {
          id: quiz.id,
          user_id: quiz.user_id,
          category_id: quiz.category_id,
          total_questions: quiz.total_questions,
          correct_answers: quiz.correct_answers,
          incorrect_answers: quiz.incorrect_answers,
          score: quiz.score,
          played_at: new Date(quiz.played_at)
        }
      });
    }
    console.log(`✓ ${quizzes.length} quizzes seeded`);
  }

  // 5. Leaderboard
  const leaderboard = readJson('leaderboard.json');
  if (leaderboard.length > 0) {
    for (const entry of leaderboard) {
      await prisma.leaderboard.upsert({
        where: { user_id: entry.user_id },
        update: { rank: entry.rank },
        create: {
          id: entry.id,
          user_id: entry.user_id,
          rank: entry.rank
        }
      });
    }
    console.log(`✓ ${leaderboard.length} leaderboard entries seeded`);
  }

  // 6. Feedback
  const feedbacks = readJson('feedback.json');
  if (feedbacks.length > 0) {
    for (const fb of feedbacks) {
      await prisma.feedback.upsert({
        where: { id: fb.id },
        update: {},
        create: {
          id: fb.id,
          name: fb.name,
          email: fb.email,
          message: fb.message,
          createdAt: new Date(fb.createdAt)
        }
      });
    }
    console.log(`✓ ${feedbacks.length} feedbacks seeded`);
  }

  // 7. UserQuestionInteraction
  const interactions = readJson('interactions.json');
  if (interactions.length > 0) {
    let count = 0;
    for (const i of interactions) {
      try {
        await prisma.userQuestionInteraction.upsert({
          where: { id: i.id },
          update: {},
          create: {
            id: i.id,
            user_id: i.user_id,
            question_id: i.question_id,
            quiz_id: i.quiz_id,
            seen_at: new Date(i.seen_at),
            answered_at: i.answered_at ? new Date(i.answered_at) : null,
            is_correct: i.is_correct,
            user_answer: i.user_answer
          }
        });
        count++;
      } catch (e) {
        // Skip if foreign key constraint fails
      }
    }
    console.log(`✓ ${count} interactions seeded`);
  }

  // Reset sequences (ignore errors if sequence doesn't exist)
  try {
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Category"', 'category_id'), (SELECT COALESCE(MAX(id), 1) FROM "Category"))`);
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'user_id'), (SELECT COALESCE(MAX(id), 1) FROM "User"))`);
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Question"', 'question_id'), (SELECT COALESCE(MAX(id), 1) FROM "Question"))`);
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Quiz"', 'quiz_id'), (SELECT COALESCE(MAX(id), 1) FROM "Quiz"))`);
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Leaderboard"', 'id'), (SELECT COALESCE(MAX(id), 1) FROM "Leaderboard"))`);
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Feedback"', 'id'), (SELECT COALESCE(MAX(id), 1) FROM "Feedback"))`);
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"UserQuestionInteraction"', 'id'), (SELECT COALESCE(MAX(id), 1) FROM "UserQuestionInteraction"))`);
  } catch (e) {
    console.log('⚠ Could not reset sequences (this is okay for first run)');
  }
  console.log('\n✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
