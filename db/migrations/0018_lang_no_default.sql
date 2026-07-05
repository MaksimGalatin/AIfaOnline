-- Language must be NULL until the user explicitly picks it (/language). Default 'en' caused mixed-language sessions.
ALTER TABLE users ALTER COLUMN lang DROP DEFAULT;
