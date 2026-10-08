export function formatStatus(status: string): string {
 const map: Record<string, string> = {
 DRAFT: 'Draft',
 SUBMITTED: 'Submitted',
 WAITING_FOR_CENTRE: 'Waiting for Akshaya Centre',
 ACCEPTED: 'Accepted',
 UNDER_REVIEW: 'Under Review',
 CORRECTION_REQUIRED: 'Correction Required',
 INTERACTION_REQUIRED: 'Interaction Required',
 INTERACTION_SCHEDULED: 'Interaction Scheduled',
 READY_FOR_PROCESSING: 'Ready for Processing',
 PROCESSING: 'Processing',
 PAYMENT_PENDING: 'Payment Pending',
 COMPLETED: 'Completed',
 CLOSED: 'Closed',
 CANCELLED: 'Cancelled',
 UNABLE_TO_PROCEED: 'Unable to Proceed'
 };

 return map[status] || status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y ago`;
}
