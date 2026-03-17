import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sb_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401/403 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (error.response.data?.error === 'Invalid or expired token') {
        localStorage.removeItem('sb_token');
        localStorage.removeItem('sb_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ---- Auth ----
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// ---- Users ----
export const usersAPI = {
  getProfile: (userId) => api.get(`/users/profile/${userId}`),
  updateProfile: (data) => api.put('/users/profile', data),
  getTutors: (params) => api.get('/users/tutors', { params }),
  getDashboard: () => api.get('/users/dashboard'),
  getStats: () => api.get('/users/stats'),
};

// ---- Skills ----
export const skillsAPI = {
  getAll: () => api.get('/skills'),
  submitRequest: (data) => api.post('/skills/request', data),
  getRequests: () => api.get('/skills/requests'),
  updateRequest: (id, data) => api.put(`/skills/requests/${id}`, data),
};

// ---- Listings ----
export const listingsAPI = {
  getAll: () => api.get('/listings'),
  getById: (id) => api.get(`/listings/${id}`),
  create: (data) => api.post('/listings', data),
  update: (id, data) => api.put(`/listings/${id}`, data),
  delete: (id) => api.delete(`/listings/${id}`),
};

// ---- Availability ----
export const availabilityAPI = {
  getByTutor: (tutorId) => api.get(`/availability/tutor/${tutorId}`),
  create: (data) => api.post('/availability', data),
  delete: (id) => api.delete(`/availability/${id}`),
};

// ---- Bookings ----
export const bookingsAPI = {
  create: (data) => api.post('/bookings', data),
  getAll: (params) => api.get('/bookings', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  accept: (id) => api.put(`/bookings/${id}/accept`),
  decline: (id) => api.put(`/bookings/${id}/decline`),
  complete: (id) => api.put(`/bookings/${id}/complete`),
  cancel: (id) => api.put(`/bookings/${id}/cancel`),
  sendMessage: (id, data) => api.post(`/bookings/${id}/message`, data),
};

// ---- Reviews ----
export const reviewsAPI = {
  create: (data) => api.post('/reviews', data),
  getByTutor: (tutorId) => api.get(`/reviews/tutor/${tutorId}`),
  getAdmin: () => api.get('/reviews/admin'),
  flag: (id) => api.put(`/reviews/${id}/flag`),
};

// ---- Wallet ----
export const walletAPI = {
  topUp: (data) => api.post('/wallet/topup', data),
  withdraw: (data) => api.post('/wallet/withdraw', data),
  getTransactions: () => api.get('/wallet/transactions'),
};

// ---- Admin ----
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  suspendUser: (id) => api.put(`/admin/users/${id}/suspend`),
  getInventory: () => api.get('/admin/tutors/inventory'),
  getOrders: (params) => api.get('/admin/orders', { params }),
  getFinancialReport: (params) => api.get('/admin/reports/financial', { params }),
  downloadCSV: (params) => api.get('/admin/reports/financial/csv', { params, responseType: 'blob' }),
  getPartners: () => api.get('/admin/partners'),
};

// ---- Invoices ----
export const invoicesAPI = {
  download: (bookingId) => api.get(`/invoices/${bookingId}`, { responseType: 'blob' }),
};

// ---- Service Gigs ----
export const gigsAPI = {
  getAll: (params) => api.get('/gigs', { params }),
  getById: (id) => api.get(`/gigs/${id}`),
  create: (data) => api.post('/gigs', data),
  update: (id, data) => api.put(`/gigs/${id}`, data),
  delete: (id) => api.delete(`/gigs/${id}`),
  getMy: () => api.get('/gigs/my/listings'),
  getCategories: () => api.get('/gigs/categories'),
  requestCategory: (data) => api.post('/gigs/categories/request', data),
};

// ---- Service Requests ----
export const serviceRequestsAPI = {
  getAll: (params) => api.get('/service-requests', { params }),
  getById: (id) => api.get(`/service-requests/${id}`),
  create: (data) => api.post('/service-requests', data),
  update: (id, data) => api.put(`/service-requests/${id}`, data),
  delete: (id) => api.delete(`/service-requests/${id}`),
  getMy: () => api.get('/service-requests/my'),
  apply: (id, data) => api.post(`/service-requests/${id}/apply`, data),
  acceptApplication: (requestId, appId) => api.put(`/service-requests/${requestId}/applications/${appId}/accept`),
};

// ---- Service Orders ----
export const serviceOrdersAPI = {
  getAll: (params) => api.get('/service-orders', { params }),
  getById: (id) => api.get(`/service-orders/${id}`),
  create: (data) => api.post('/service-orders', data),
  deliver: (id) => api.put(`/service-orders/${id}/deliver`),
  confirm: (id) => api.put(`/service-orders/${id}/confirm`),
  cancel: (id) => api.put(`/service-orders/${id}/cancel`),
};

// ---- Service Messages ----
export const serviceMessagesAPI = {
  getConversations: () => api.get('/service-messages/conversations'),
  getMessages: (userId, params) => api.get(`/service-messages/${userId}`, { params }),
  send: (data) => api.post('/service-messages', data),
  getUnreadCount: () => api.get('/service-messages/unread/count'),
};

export default api;
