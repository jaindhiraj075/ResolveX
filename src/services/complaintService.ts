import api from './api';
import { SLAInfo } from '../components/sla/SLACard';

export interface ComplaintPayload {
  title: string;
  description: string;
  category_id?: number;
  department_id?: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  attachment?: {
    file_name: string;
    file_path?: string;
    file_type?: string;
    file_size?: number;
  };
}

export interface ComplaintFilters {
  status?: string;
  priority?: string;
  category_id?: number | string;
  department_id?: number | string;
  search?: string;
  sla_status?: string;
}

export interface FeedbackData {
  id?: number;
  complaint_id?: number;
  student_id?: number;
  rating: number;
  comments?: string;
  created_at?: string;
}

export interface ComplaintItem {
  id: number;
  complaint_id: string;
  student_id: number;
  student_name?: string;
  student_email?: string;
  title: string;
  description: string;
  category_id: number;
  category_name?: string;
  department_id: number;
  department_name?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: string;

  // Phase 4 & Phase 9: AI Intelligence fields
  ai_confidence?: number;
  ai_category?: string;
  ai_category_confidence?: number;
  ai_department?: string;
  ai_department_confidence?: number;
  ai_priority?: string;
  ai_priority_confidence?: number;
  ai_summary?: string;
  ai_explanation?: string;
  ai_factors?: string[];
  ai_human_review?: boolean;
  clarification_questions?: string[];
  is_out_of_taxonomy?: boolean;
  location?: string;
  disruption_level?: string;

  // Phase 4 & 9: Duplicate tracking
  duplicate_score?: number;
  is_duplicate?: boolean;
  is_potential_duplicate?: boolean;
  duplicate_reason?: string;
  original_complaint_id?: number;
  original_complaint_readable_id?: string;
  original_title?: string;

  // Phase 4: Human override tracking
  final_category?: string;
  final_department?: string;
  final_priority?: string;
  is_overridden?: boolean;

  // Phase 5: SLA, Escalation & Reopen
  sla_due_at?: string;
  sla_status?: 'ON_TRACK' | 'DUE_SOON' | 'OVERDUE' | 'RESOLVED' | string;
  sla_info?: SLAInfo;
  escalation_level?: number;
  reopened_count?: number;
  reopen_reason?: string;
  feedback?: FeedbackData | null;

  resolved_at?: string;
  created_at: string;
  updated_at: string;
  assigned_staff_id?: number;
  assigned_staff_name?: string;
  history?: Array<{
    id: number;
    action: string;
    from_status?: string;
    to_status?: string;
    performed_by_id?: number;
    performed_by_name?: string;
    notes?: string;
    created_at: string;
  }>;
  messages?: Array<{
    id: number;
    sender_id: number;
    sender_name?: string;
    sender_role?: string;
    message: string;
    is_internal: boolean;
    created_at: string;
  }>;
  attachments?: Array<{
    id: number;
    file_name: string;
    file_type?: string;
    file_size?: number;
    created_at: string;
  }>;
  assignments?: Array<{
    id: number;
    staff_id: number;
    staff_name?: string;
    assigned_by_name?: string;
    is_active: boolean;
    notes?: string;
    assigned_at: string;
  }>;
}

export interface RecurringCluster {
  category: string;
  location: string;
  department: string;
  incident_count: number;
  unresolved_count: number;
  complaint_ids: string[];
  confidence: number;
  insight: string;
  recommended_action: string;
  sample_size_valid: boolean;
}

export interface AIAnalysisResult {
  category: string;
  category_confidence: number;
  department: string;
  department_id: number;
  department_confidence: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  priority_confidence: number;
  explanation?: string;
  factors?: string[];
  summary?: string;
  location?: string;
  disruption_level?: string;
  human_review_required?: boolean;
  duplicate: boolean;
  is_potential_duplicate?: boolean;
  duplicate_confidence: number;
  duplicate_reason?: string;
  original_complaint_id?: number | null;
  original_complaint_readable_id?: string | null;
  original_title?: string | null;
  is_low_confidence: boolean;
}

export const complaintService = {
  async getOptions() {
    const res = await api.get('/api/complaints/meta/options');
    return res.data?.data || { departments: [], categories: [] };
  },

  async analyzeComplaint(payload: { title: string; description: string }) {
    const res = await api.post('/api/ai/analyze', payload);
    return res.data?.data as AIAnalysisResult;
  },

  async createComplaint(payload: ComplaintPayload) {
    const res = await api.post('/api/complaints', payload);
    return res.data;
  },

  async getComplaints(filters?: ComplaintFilters) {
    const res = await api.get('/api/complaints', { params: filters });
    return res.data?.data?.complaints || [];
  },

  async getComplaint(identifier: string | number) {
    const res = await api.get(`/api/complaints/${identifier}`);
    return res.data?.data?.complaint as ComplaintItem;
  },

  async getComplaintSLA(identifier: string | number) {
    const res = await api.get(`/api/complaints/${identifier}/sla`);
    return res.data?.data as SLAInfo;
  },

  async reopenComplaint(identifier: string | number, reason: string) {
    const res = await api.post(`/api/complaints/${identifier}/reopen`, { reason });
    return res.data?.data as ComplaintItem;
  },

  async submitFeedback(
    identifier: string | number,
    payload: { rating: number; comments?: string }
  ) {
    const res = await api.post(`/api/complaints/${identifier}/feedback`, payload);
    return res.data?.data as FeedbackData;
  },

  async getFeedback(identifier: string | number) {
    const res = await api.get(`/api/complaints/${identifier}/feedback`);
    return res.data?.data?.feedback as FeedbackData | null;
  },

  async updateFeedback(
    identifier: string | number,
    payload: { rating: number; comments?: string }
  ) {
    const res = await api.put(`/api/complaints/${identifier}/feedback`, payload);
    return res.data?.data as FeedbackData;
  },

  async overrideAI(
    identifier: string | number,
    payload: {
      category_id?: number;
      department_id?: number;
      priority?: string;
      reason?: string;
    }
  ) {
    const res = await api.post(`/api/complaints/${identifier}/override`, payload);
    return res.data?.data as ComplaintItem;
  },

  async getStaffComplaints(filters?: ComplaintFilters) {
    const res = await api.get('/api/staff/complaints', { params: filters });
    return res.data?.data?.complaints || [];
  },

  async updateStaffStatus(identifier: string | number, status: string, notes?: string) {
    const res = await api.put(`/api/staff/complaints/${identifier}/status`, { status, notes });
    return res.data?.data;
  },

  async requestInfo(identifier: string | number, message: string) {
    const res = await api.post(`/api/staff/complaints/${identifier}/request-info`, { message });
    return res.data?.data;
  },

  async respondInfo(identifier: string | number, message: string) {
    const res = await api.post(`/api/complaints/${identifier}/respond-info`, { message });
    return res.data?.data;
  },

  async resolveComplaint(identifier: string | number, resolution_summary: string, resolution_details?: string) {
    const res = await api.post(`/api/staff/complaints/${identifier}/resolve`, {
      resolution_summary,
      resolution_details,
    });
    return res.data?.data;
  },

  async assignComplaint(identifier: string | number, staff_id: number, notes?: string) {
    const res = await api.post(`/api/admin/complaints/${identifier}/assign`, {
      staff_id,
      notes,
    });
    return res.data?.data;
  },

  async getAdminSLA() {
    const res = await api.get('/api/admin/sla');
    return res.data?.data;
  },

  async getStaffSLA() {
    const res = await api.get('/api/staff/sla');
    return res.data?.data;
  },

  async getNotifications() {
    const res = await api.get('/api/notifications');
    return res.data?.data || { notifications: [], unread_count: 0 };
  },

  async markNotificationRead(id: number) {
    const res = await api.put(`/api/notifications/${id}/read`);
    return res.data?.data;
  },

  async markAllNotificationsRead() {
    const res = await api.put('/api/notifications/read-all');
    return res.data;
  },

  // Phase 6: Admin Analytics & Reports API
  async getAnalyticsOverview(params?: Record<string, any>) {
    const res = await api.get('/api/admin/analytics/overview', { params });
    return res.data?.data;
  },

  async getAnalyticsTrends(params?: Record<string, any>) {
    const res = await api.get('/api/admin/analytics/trends', { params });
    return res.data?.data?.trends || [];
  },

  async getAnalyticsStatus(params?: Record<string, any>) {
    const res = await api.get('/api/admin/analytics/status', { params });
    return res.data?.data?.distribution || [];
  },

  async getAnalyticsCategories(params?: Record<string, any>) {
    const res = await api.get('/api/admin/analytics/categories', { params });
    return res.data?.data?.categories || [];
  },

  async getAnalyticsDepartments(params?: Record<string, any>) {
    const res = await api.get('/api/admin/analytics/departments', { params });
    return res.data?.data?.departments || [];
  },

  async getAnalyticsPriorities(params?: Record<string, any>) {
    const res = await api.get('/api/admin/analytics/priorities', { params });
    return res.data?.data?.priorities || [];
  },

  async getAnalyticsSLA(params?: Record<string, any>) {
    const res = await api.get('/api/admin/analytics/sla', { params });
    return res.data?.data;
  },

  async getAnalyticsResolution(params?: Record<string, any>) {
    const res = await api.get('/api/admin/analytics/resolution', { params });
    return res.data?.data;
  },

  async getAnalyticsStaff(params?: Record<string, any>) {
    const res = await api.get('/api/admin/analytics/staff', { params });
    return res.data?.data?.staff || [];
  },

  async getAnalyticsFeedback(params?: Record<string, any>) {
    const res = await api.get('/api/admin/analytics/feedback', { params });
    return res.data?.data;
  },

  async getAnalyticsAI(params?: Record<string, any>) {
    const res = await api.get('/api/admin/analytics/ai', { params });
    return res.data?.data;
  },

  async getStaffPerformanceDetail(staffId: number) {
    const res = await api.get(`/api/admin/staff/${staffId}/performance`);
    return res.data?.data;
  },

  async exportAnalyticsCSV(params?: Record<string, any>) {
    const res = await api.get('/api/admin/analytics/export', {
      params,
      responseType: 'blob',
    });
    return res.data;
  },

  async getRecurringIssues() {
    const res = await api.get('/api/ai/recurring-issues');
    return (res.data?.data?.clusters as RecurringCluster[]) || [];
  },
};

export default complaintService;
