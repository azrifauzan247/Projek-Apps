export type Role = "admin" | "leader" | "member";
export type Status = "pending" | "ongoing" | "done";
export type Priority = "Low" | "Medium" | "High" | "Critical";
export interface Me { id: number; username: string; role: Role; memberId: number | null; unitId: number | null; name: string }
export interface Unit { id: number; name: string; description: string; sort: number }
export interface Member { id: number; name: string; unit_id: number | null; position: string; phone: string; extra_resp: string; active: number; sort: number }
export interface Task {
  id: number; title: string; description: string; unit_id: number | null; member_id: number | null; priority: Priority;
  start_date: string | null; deadline: string | null; status: Status; progress: number; notes: string; is_draft: number;
  completed_at: string | null; created_at: string; updated_at: string;
}
export interface Attachment { id: number; task_id: number; name: string; stored: string; url: string; size: number; mime: string; created_at: string }
export interface TaskLog { task_id: number; at: string; status: Status; progress: number; by_user: string }
export interface Followup {
  id: number; member_id: number; task_id: number | null; contacted_at: string; method: string; summary: string; responded: number;
  response: string; action_required: string; next_followup: string | null; created_by: string; created_at: string;
}
export interface CheckItem { id: number; category: string; title: string; done: number; done_at: string | null; done_by: string; sort: number }
export interface ReportMeta { id: number; type: string; title: string; created_by: string; created_at: string }
export interface UserRow { id: number; username: string; role: Role; member_id: number | null; created_at: string }
export interface WatchItem {
  id: number; title: string; notes: string; task_id: number | null; owner: "Pengarah" | "Timbalan Pengarah" | "Berdua";
  due_date: string | null; priority: Priority; done: number; done_at: string | null; done_by: string; created_by: string; created_at: string; updated_at: string;
}
export interface Settings {
  event_name: string; event_date: string; venue: string; director: string; stale_days: string; soon_days: string; wa_template: string;
}
export interface AppData {
  me: Me; settings: Settings; units: Unit[]; members: Member[]; tasks: Task[]; attachments: Attachment[]; taskLog: TaskLog[];
  followups: Followup[]; checklist: CheckItem[]; reports: ReportMeta[]; users: UserRow[]; watch: WatchItem[]; watchReady: boolean;
}
export type EffStatus = "done" | "overdue" | "ongoing" | "pending";
