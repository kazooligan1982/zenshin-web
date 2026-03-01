// チャートの型定義
export interface Area {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  chart_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface HistoryItem {
  id: string;
  content: string;
  type: "update" | "comment";
  createdAt: string;
  createdBy?: string;
}

export interface VisionItem {
  id: string; // UUID (動的タグはUI側でindex+1を使用)
  content: string;
  createdAt: string;
  updatedAt?: string;
  assignee?: string;
  dueDate?: string;
  targetDate?: string; // 時間軸に基づいた動的な順序用
  isLocked?: boolean;
  description?: string;
  area_id?: string | null; // エリアID
  sort_order?: number;
  comment_count?: number;
  history?: HistoryItem[]; // 履歴
}

export interface RealityItem {
  id: string; // UUID (動的タグはUI側でindex+1を使用)
  content: string;
  createdAt: string;
  dueDate?: string;
  relatedVisionId?: string; // 将来的な紐付け用
  area_id?: string | null; // エリアID
  isLocked?: boolean;
  description?: string;
  created_by?: string | null;
  sort_order?: number;
  created_by_profile?: { name?: string; avatar_url?: string } | null;
  comment_count?: number;
  history?: HistoryItem[]; // 履歴
}

export interface ActionPlan {
  id: string;
  title: string;
  dueDate?: string;
  assignee?: string;
  status?: "todo" | "in_progress" | "done" | "pending" | "canceled" | null;
  hasSubChart?: boolean;
  subChartId?: string;
  childChartId?: string; // テレスコーピング用
  isCompleted?: boolean; // 完了状態
  description?: string | null; // 詳細/メモ
  comment_count?: number;
  history?: HistoryItem[]; // 履歴
  area_id?: string | null; // エリアID（カテゴリータグ）
  sort_order?: number;
  tension_id?: string | null;
}

export type TensionStatus = "active" | "review_needed" | "resolved";

export interface Tension {
  id: string;
  title: string;
  description?: string;
  status: TensionStatus;
  area_id?: string | null;
  sort_order?: number;
  visionIds: string[]; // 関連するVisionのIDリスト
  realityIds: string[]; // 関連するRealityのIDリスト
  actionPlans: ActionPlan[];
  /** 楽観的更新時のtempId→実ID置換でコンポーネントのアンマウントを防ぐための安定キー */
  _stableKey?: string;
}

export type ChartStatus = "active" | "completed";

export interface Chart {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  workspace_id?: string | null;
  status?: ChartStatus;
  visions: VisionItem[];
  realities: RealityItem[];
  tensions: Tension[];
  looseActions?: ActionPlan[];
  areas: Area[]; // エリアリスト
  parentChartId?: string;
  parentChartTitle?: string;
  parentActionId?: string;
  parentActionTitle?: string;
  breadcrumbs?: BreadcrumbItem[];
}

export interface BreadcrumbItem {
  id: string;
  title: string;
  type?: "chart" | "action"; // オプショナル（後方互換性のため）
}

