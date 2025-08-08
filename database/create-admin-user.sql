-- Manual Admin User Creation Script
-- This script creates an admin user in the users table
-- Password: Boncell!23 (hashed using bcrypt with salt rounds 12)

INSERT INTO public.users (
    id,
    full_name,
    email,
    password_hash,
    phone,
    role,
    is_verified,
    is_active,
    created_at,
    updated_at
)
VALUES (
    uuid_generate_v4(),
    'SuperAdmin',
    'warungames@gmail.com',
    '$2a$12$1yBEG7fzM4bwNrTafN58NOjgmf8B6fMtOLk7HVsQPeFh6uKee2zPi',
    '085226006886',
    'admin',
    true,
    true,
    now(),
    now()
);

-- Verify the admin user was created successfully
SELECT id, full_name, email, role, is_verified, is_active, created_at
FROM public.users
WHERE email = 'warungames@gmail.com' AND role = 'admin';