type LogLevel = 'info' | 'warn' | 'error';
type LogAction = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'auth' 
  | 'error' 
  | 'access'
  | 'list'
  | 'read'
  | 'generate';
type LogModule = 
  | 'user' 
  | 'question' 
  | 'category' 
  | 'quiz' 
  | 'auth' 
  | 'system' 
  | 'feedback'
  | 'ai';

interface LogData {
  level: LogLevel;
  module: LogModule;
  action: LogAction;
  message: string;
  timestamp: string;
  path?: string;
  userId?: number;
  error?: any;
  metadata?: Record<string, any>;
}

class Logger {
  private async saveLog(logData: LogData) {
    try {
      const response = await fetch(`/api/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });

      if (!response.ok) {
        console.error('Log kaydetme hatası:', await response.text());
      }
    } catch (error) {
      console.error('Log kaydetme hatası:', error);
    }
  }

  // Kullanıcı işlemleri
  userCreated(username: string, userId: number) {
    this.info('user', 'create', `Yeni kullanıcı oluşturuldu: ${username}`, {
      userId,
      username
    });
  }

  userUpdated(username: string, userId: number, updatedFields: string[]) {
    this.info('user', 'update', `Kullanıcı güncellendi: ${username}`, {
      userId,
      username,
      updatedFields
    });
  }

  userDeleted(username: string, userId: number) {
    this.info('user', 'delete', `Kullanıcı silindi: ${username}`, {
      userId,
      username
    });
  }

  // Soru işlemleri
  questionCreated(questionId: number, categoryName: string) {
    this.info('question', 'create', `Yeni soru eklendi (ID: ${questionId})`, {
      questionId,
      categoryName
    });
  }

  questionUpdated(questionId: number, categoryName: string) {
    this.info('question', 'update', `Soru güncellendi (ID: ${questionId})`, {
      questionId,
      categoryName
    });
  }

  questionDeleted(questionId: number, categoryName: string) {
    this.info('question', 'delete', `Soru silindi (ID: ${questionId})`, {
      questionId,
      categoryName
    });
  }

  // Kategori işlemleri
  categoryCreated(name: string, categoryId: number) {
    this.info('category', 'create', `Yeni kategori oluşturuldu: ${name}`, {
      categoryId,
      name
    });
  }

  categoryUpdated(name: string, categoryId: number) {
    this.info('category', 'update', `Kategori güncellendi: ${name}`, {
      categoryId,
      name
    });
  }

  categoryDeleted(name: string, categoryId: number) {
    this.info('category', 'delete', `Kategori silindi: ${name}`, {
      categoryId,
      name
    });
  }

  // Sistem hataları
  systemError(error: Error, context: string, metadata?: Record<string, any>) {
    this.error('system', error, {
      errorContext: context,
      ...metadata
    });
  }

  databaseError(error: Error, context: string, metadata?: Record<string, any>) {
    this.error('system', error, {
      errorType: 'DATABASE_ERROR',
      errorContext: context,
      ...metadata
    });
  }

  authError(error: Error, context: string, metadata?: Record<string, any>) {
    this.error('auth', error, {
      errorType: 'AUTH_ERROR',
      errorContext: context,
      ...metadata
    });
  }

  // Auth işlemleri için helper metodlar
  authLog(action: 'login' | 'logout' | 'register', message: string, metadata?: Record<string, any>) {
    this.info('auth', 'auth', message, metadata);
  }

  // AI işlemleri için yeni metodlar
  aiQuestionGenerated(category: string, questionCount: number, metadata?: Record<string, any>) {
    this.info('ai', 'generate', `${questionCount} soru üretildi - Kategori: ${category}`, {
      category,
      questionCount,
      ...metadata
    });
  }

  aiError(error: Error, context: string, metadata?: Record<string, any>) {
    this.error('system', error, {
      errorType: 'AI_ERROR',
      errorContext: context,
      ...metadata
    });
  }

  aiRequestLog(prompt: string, metadata?: Record<string, any>) {
    this.info('ai', 'create', 'AI isteği gönderildi', {
      prompt,
      ...metadata
    });
  }

  aiResponseLog(success: boolean, metadata?: Record<string, any>) {
    this.info('ai', 'read', `AI yanıtı ${success ? 'başarılı' : 'başarısız'}`, {
      success,
      ...metadata
    });
  }

  // AI işlemleri için bilgi logu
  aiInfo(message: string, metadata?: Record<string, any>) {
    this.info('system', 'generate', message, {
      type: 'AI_OPERATION',
      ...metadata
    });
  }

  // Public metodlar
  public info(module: LogModule, action: LogAction, message: string, metadata?: Record<string, any>) {
    const logData: LogData = {
      level: 'info',
      module,
      action,
      message,
      timestamp: new Date().toISOString(),
      metadata,
    };
    this.saveLog(logData);
  }

  public warn(module: LogModule, action: LogAction, message: string, metadata?: Record<string, any>) {
    const logData: LogData = {
      level: 'warn',
      module,
      action,
      message,
      timestamp: new Date().toISOString(),
      metadata,
    };
    this.saveLog(logData);
  }

  public error(module: LogModule, error: Error, metadata?: Record<string, any>) {
    const logData: LogData = {
      level: 'error',
      module,
      action: 'error',
      message: error.message,
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        stack: error.stack,
      },
      metadata,
    };
    this.saveLog(logData);
  }
}

export const logger = new Logger();