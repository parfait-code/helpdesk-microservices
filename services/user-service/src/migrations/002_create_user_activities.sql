-- src/migrations/002_create_user_activities.sql
-- user_activities table
CREATE TABLE user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX idx_user_activities_created_at ON user_activities(created_at);

-- Create index for activity data queries
CREATE INDEX idx_user_activities_data ON user_activities USING GIN (activity_data);

-- Comment on tables
COMMENT ON TABLE user_profiles IS 'User profile information and preferences';
COMMENT ON TABLE user_activities IS 'User activity tracking and audit log';

-- Default preferences structure
INSERT INTO user_profiles (user_id, email, first_name, preferences) VALUES
('00000000-0000-0000-0000-000000000000', 'system@example.com', 'System', 
'{
  "language": "fr",
  "theme": "light",
  "notifications": {
    "email": true,
    "browser": true,
    "sms": false
  },
  "timezone": "Europe/Paris"
}'::jsonb)
ON CONFLICT (user_id) DO NOTHING;