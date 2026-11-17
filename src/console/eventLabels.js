// Plain words for audit events. An unknown event falls back to its own name in lowercase.
const LABELS = {
  LOGIN_SUCCESS: 'Signed in',
  LOGIN_FAILED: 'Failed sign-in',
  REGISTER_FAILED: 'Failed sign-up',
  USER_JOINED: 'Joined the organization',
  USER_UPDATED: 'Person updated',
  PASSWORD_CHANGED: 'Password changed',
  INVITE_CREATED: 'Invite created',
  CONVERSATION: 'Question asked',
  TICKET_CREATED: 'Ticket created',
  TICKET_STATUS_CHANGED: 'Ticket status changed',
  TICKET_PRIORITY_RAISED: 'Ticket priority raised',
  THREAD_MESSAGE_POSTED: 'Ticket or request reply sent',
  FORM_TEMPLATE_CREATED: 'Form created',
  FORM_TEMPLATE_UPDATED: 'Form updated',
  FORM_SUBMISSION_VIEWED: 'Form submission opened',
  FORM_STATUS_CHANGED: 'Form status changed',
  FORM_SENSITIVE_REVEALED: 'Protected answer shown',
  STAFF_MESSAGE_SENT: 'Staff message sent',
  FORM_SUBMITTED: 'Form submitted',
  CUSTOMER_JOINED: 'Customer registered',
  ORG_CREATED: 'Organization created',
  COMPANY_SETTINGS_CHANGED: 'Company setting changed',
  AUDIT_EXPORTED: 'Audit log downloaded'
};

export const eventLabel = (type) =>
  LABELS[type] || String(type || '').toLowerCase().replace(/_/g, ' ');