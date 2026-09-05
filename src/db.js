import Dexie from 'dexie';

export const db = new Dexie('VKUSurveyOfflineDB');

db.version(1).stores({
  offline_inspections: '++id, user_id, user_email, facility_name, description, status, image_url, created_at'
});
