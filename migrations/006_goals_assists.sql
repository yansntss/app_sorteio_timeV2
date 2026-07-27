-- Adds per-match goals/assists tracking, accumulated into player_profiles.
ALTER TABLE game_confirmations ADD COLUMN goals INTEGER DEFAULT NULL;
ALTER TABLE game_confirmations ADD COLUMN assists INTEGER DEFAULT NULL;
ALTER TABLE player_profiles ADD COLUMN total_goals INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_profiles ADD COLUMN total_assists INTEGER NOT NULL DEFAULT 0;
