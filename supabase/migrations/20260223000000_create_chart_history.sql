-- chart_history: エンティティ変更の履歴を記録
CREATE TABLE IF NOT EXISTS chart_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES charts(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('vision', 'reality', 'tension', 'action', 'comment', 'attachment')),
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'updated', 'deleted', 'completed', 'reopened', 'moved')),
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chart_history_chart_entity ON chart_history(chart_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_chart_history_created_at ON chart_history(created_at DESC);
