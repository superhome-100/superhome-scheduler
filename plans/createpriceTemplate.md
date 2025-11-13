-- Create price_templates table with name as primary key (TEXT) and id as text field
CREATE TABLE price_templates (
    name TEXT PRIMARY KEY,
    id TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create price_template_updates with price_template_name foreign key referencing price_templates(name)
CREATE TABLE price_template_updates (
    id TEXT PRIMARY KEY,
    price_template_name TEXT NOT NULL REFERENCES price_templates(name) ON DELETE CASCADE,
    coach_ow INTEGER NOT NULL,
    coach_pool INTEGER NOT NULL,
    coach_classroom INTEGER NOT NULL,
    auto_ow INTEGER NOT NULL,
    auto_pool INTEGER NOT NULL,
    cbs_ow INTEGER NOT NULL,
    prosafety_ow INTEGER NOT NULL,
    platform_ow INTEGER NOT NULL,
    platformcbs_ow INTEGER NOT NULL,
    compsetup_ow INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add price_template_name column (TEXT) referencing price_templates.name to user_profiles to avoid confusion
ALTER TABLE user_profiles
ADD COLUMN price_template_name TEXT REFERENCES price_templates(name);
