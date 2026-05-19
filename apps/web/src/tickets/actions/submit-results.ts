export interface SubmitTicketSuccess {
  readonly status: "success";
  readonly ticket_id: string;
  readonly identifier: string;
  readonly state: string;
}

export interface SubmitTicketError {
  readonly status: "error";
  readonly serverError?: string;
  readonly errors: Record<string, string[]>;
}

export type SubmitTicketResult = SubmitTicketSuccess | SubmitTicketError;

export const EMPTY_SUBMIT_ERRORS: Record<string, string[]> = {};
