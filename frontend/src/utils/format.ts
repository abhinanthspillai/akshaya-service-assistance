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
