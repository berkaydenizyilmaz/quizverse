import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/api-response";
import { z } from "zod";
import { APIError, ValidationError, AuthenticationError } from "@/lib/errors";
import jwt from 'jsonwebtoken';
import { logger } from "@/lib/logger";

/**
 * Quiz sonucu validasyon şeması
 */
const quizSchema = z.object({
  categoryId: z.number(),
  totalQuestions: z.number(),
  correctAnswers: z.number(),
  incorrectAnswers: z.number(),
  score: z.number(),
  questions: z.array(z.object({
    id: z.number(),
    isCorrect: z.boolean(),
    userAnswer: z.string()
  }))
});

/**
 * Liderlik tablosu sıralamalarını günceller
 * 
 * Veritabanı İşlemleri:
 * 1. En az 1 quiz çözmüş kullanıcıları getirir
 * 2. Toplam puana göre sıralar
 * 3. Her kullanıcının sıralama bilgisini günceller
 */
async function updateLeaderboardRanks(prisma: any) {
  try {
    // En az 1 quiz çözmüş kullanıcıları puana göre sırala
    const users = await prisma.user.findMany({
      where: {
        total_play_count: {
          gt: 0
        }
      },
      orderBy: {
        total_score: 'desc'
      },
      select: {
        id: true
      }
    });

    // Her kullanıcının sıralamasını güncelle
    for (let i = 0; i < users.length; i++) {
      await prisma.leaderboard.upsert({
        where: { user_id: users[i].id },
        create: {
          user_id: users[i].id,
          rank: i + 1
        },
        update: {
          rank: i + 1
        }
      });
    }
  } catch (error) {
    logger.error('quiz', error as Error, {
      action: 'update',
      errorType: 'DATABASE_ERROR',
      errorContext: 'update_ranks'
    });
    throw new APIError("Lider tablosu güncellenirken hata oluştu", 500, "LEADERBOARD_ERROR");
  }
}

/**
 * POST /api/quizzes
 * Quiz sonucunu kaydeder
 * 
 * Veritabanı İşlemleri:
 * 1. Quiz tablosuna yeni kayıt ekler
 * 2. UserInteraction tablosuna soru-cevap kayıtları ekler
 * 3. User tablosunda istatistikleri günceller
 * 4. Leaderboard tablosunda sıralamaları günceller
 * 
 * İşlem Adımları:
 * 1. Kullanıcı doğrulama
 * 2. Quiz verisi validasyonu
 * 3. Quiz ve etkileşimleri kaydetme
 * 4. Kullanıcı istatistiklerini güncelleme
 * 5. Liderlik tablosunu güncelleme
 */
export async function POST(request: NextRequest) {
  let body: z.infer<typeof quizSchema> | undefined;
  let userId: number | undefined;

  try {
    // Token kontrolü
    const token = request.cookies.get("token")?.value;
    console.log('[QUIZ API] Token:', token ? 'exists' : 'missing');
    
    if (!token) {
      throw new AuthenticationError("Oturum bulunamadı");
    }

    // JWT_SECRET kontrolü
    if (!process.env.JWT_SECRET) {
      console.error('[QUIZ API] JWT_SECRET is not defined!');
      throw new APIError("Sunucu yapılandırma hatası", 500);
    }

    // Token'dan userId al
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: number };
    userId = decoded.id;
    console.log('[QUIZ API] User ID:', userId);

    // Request body'i doğrula
    try {
      body = await request.json();
    } catch (e) {
      throw new ValidationError("Geçersiz istek formatı");
    }

    // Quiz verisi validasyonu
    quizSchema.parse(body);
    const validatedBody = body as z.infer<typeof quizSchema>;

    // Quiz sonuçlarını kaydet (önce quiz'i oluştur)
    const quiz = await prisma.quiz.create({
      data: {
        user_id: userId,
        category_id: validatedBody.categoryId,
        total_questions: validatedBody.totalQuestions,
        correct_answers: validatedBody.correctAnswers,
        incorrect_answers: validatedBody.incorrectAnswers,
        score: validatedBody.score
      }
    });

    // Sonra user interactions'ı quiz_id ile birlikte oluştur
    await prisma.userQuestionInteraction.createMany({
      data: validatedBody.questions.map(q => ({
        user_id: userId!,
        question_id: q.id,
        quiz_id: quiz.id,
        is_correct: q.isCorrect,
        user_answer: q.userAnswer,
        answered_at: new Date()
      })),
      skipDuplicates: true // Aynı kayıt varsa atla
    });

    // Kullanıcı istatistiklerini güncelle
    await prisma.user.update({
      where: { id: userId },
      data: {
        total_play_count: { increment: 1 },
        total_score: { increment: validatedBody.score },
        total_questions_attempted: { increment: validatedBody.totalQuestions },
        total_correct_answers: { increment: validatedBody.correctAnswers }
      }
    });

    // Liderlik tablosunu güncelle
    await updateLeaderboardRanks(prisma);

    // Başarılı quiz logu
    logger.info('quiz', 'create', 'Quiz tamamlandı', {
      quizId: quiz.id,
      userId: userId,
      categoryId: validatedBody.categoryId,
      score: validatedBody.score,
      correctAnswers: validatedBody.correctAnswers,
      totalQuestions: validatedBody.totalQuestions
    });

    return apiResponse.success({
      message: "Quiz sonuçları kaydedildi",
      data: { quizId: quiz.id }
    });

  } catch (error) {
    // Gerçek hatayı console'a yazdır
    console.error('[QUIZ API ERROR]', error);
    
    // Hata logu
    logger.error('quiz', error as Error, {
      action: 'create',
      userId: userId,
      categoryId: body?.categoryId,
      errorType: error instanceof ValidationError ? 'VALIDATION_ERROR' : 'DATABASE_ERROR',
      errorContext: 'save_quiz_result'
    });

    if (error instanceof APIError) {
      return apiResponse.error(error);
    }

    return apiResponse.error(
      new APIError(
        "Quiz sonuçları kaydedilirken bir hata oluştu",
        500,
        "INTERNAL_SERVER_ERROR"
      )
    );
  }
}