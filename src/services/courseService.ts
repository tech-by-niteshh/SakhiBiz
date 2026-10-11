import { apiRequest } from '../lib/api';

export interface RemoteCourse {
  courseId: string;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  category: string;
  language: string;
  thumbnailUrl: string;
  published: boolean;
  lessonsCount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface RemoteLesson {
  lessonId: string;
  courseId: string;
  title: string;
  titleEn?: string;
  description: string;
  order: number;
  driveFileId?: string;
  videoUrl?: string;
  duration?: string;
  published: boolean;
}

export const CourseService = {
  async getCourses(): Promise<RemoteCourse[]> {
    try {
      const data = await apiRequest<{ success: boolean; courses: RemoteCourse[] }>('/api/courses');
      return data?.courses || [];
    } catch (err) {
      console.warn('Failed to fetch courses from backend:', err);
      return [];
    }
  },

  async getCourse(courseId: string): Promise<{ course: RemoteCourse; lessons: RemoteLesson[]; quiz?: any } | null> {
    try {
      const data = await apiRequest<{ success: boolean; course: RemoteCourse; lessons: RemoteLesson[]; quiz?: any }>(
        `/api/courses/${courseId}`
      );
      if (data?.course) {
        return { course: data.course, lessons: data.lessons || [], quiz: data.quiz };
      }
      return null;
    } catch (err) {
      console.warn('Failed to fetch course details from backend:', err);
      return null;
    }
  },

  async enroll(courseId: string): Promise<any> {
    return apiRequest(`/api/courses/${courseId}/enroll`, { method: 'POST' });
  },
};
