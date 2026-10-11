export type Language = 'hi' | 'en' | 'mr' | 'bn' | 'ta' | 'te' | 'gu' | 'kn';

export type BusinessCategory = 
  | 'textiles_tailoring' 
  | 'food_processing_snacks' 
  | 'handicrafts_art' 
  | 'beauty_wellness' 
  | 'grocery_retail' 
  | 'dairy_agriculture' 
  | 'services_education'
  | 'other';

export type UserRole = 'ADMIN' | 'MODERATOR' | 'USER';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accountStatus?: AccountStatus;
  preferredLanguage: Language;
  businessCategory: BusinessCategory;
  businessStage: 'idea' | 'starting' | 'growing' | 'established';
  location: string;
  isDemoUser: boolean;
  avatarSeed?: string;
  createdAt: string;
  streakDays: number;
  completedCoursesCount: number;
}

export interface LessonContentDetail {
  introduction: string;
  storyExample: {
    title: string;
    story: string;
    character: string;
  };
  sections: {
    heading: string;
    body: string;
    tip?: string;
  }[];
  practicalActivity: {
    title: string;
    instructions: string[];
  };
  keyTakeaways: string[];
}

export interface Lesson {
  id: string;
  courseId: string;
  title: Record<string, string>;
  summary: Record<string, string>;
  durationMinutes: number;
  order: number;
  driveFileId?: string;
  videoUrl?: string;
  languageAvailable?: Language[];
  content: {
    hi?: LessonContentDetail;
    en?: LessonContentDetail;
    [key: string]: LessonContentDetail | undefined;
  };
}

export interface QuizQuestion {
  id: string;
  question: Record<string, string>;
  options: Record<string, string[]>;
  correctOptionIndex: number;
  explanation: Record<string, string>;
}

export interface Quiz {
  id: string;
  courseId: string;
  title: Record<string, string>;
  passingScorePercent: number;
  questions: QuizQuestion[];
}

export interface Course {
  id: string;
  category: 
    | 'financial_literacy'
    | 'digital_marketing'
    | 'social_media'
    | 'digital_payments'
    | 'business_planning'
    | 'customer_management'
    | 'pricing_profit'
    | 'ecommerce_basics'
    | 'government_schemes'
    | 'communication';
  title: Record<string, string>;
  shortDescription: Record<string, string>;
  fullDescription: Record<string, string>;
  level: 'Beginner' | 'Intermediate';
  estimatedHours: number;
  languageAvailable: Language[];
  thumbnail: string;
  badgeTitle: Record<string, string>;
  rating: number;
  reviewCount: number;
  lessons: Lesson[];
  quiz: Quiz;
}

export interface UserEnrollment {
  courseId: string;
  enrolledAt: string;
  completedLessonIds: string[];
  lastAccessedLessonId?: string;
  progressPercent: number;
  completedAt?: string;
}

export interface QuizAttempt {
  id: string;
  courseId: string;
  date: string;
  scorePercent: number;
  passed: boolean;
  totalQuestions: number;
  correctCount: number;
  answers: number[];
}

export interface ExpenseRecord {
  id: string;
  userId: string;
  date: string;
  category: 'raw_materials' | 'transport' | 'packaging' | 'utilities_rent' | 'marketing' | 'tools_equipment' | 'other';
  amount: number;
  description: string;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer';
  createdAt: string;
}

export interface BusinessPlan {
  id: string;
  userId: string;
  businessName: string;
  businessType: string;
  productDescription: string;
  targetCustomer: string;
  estimatedStartupCost: number;
  monthlySalesGoal: number;
  marketingPlan: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'sakhi';
  text: string;
  timestamp: string;
  source?: string;
}
