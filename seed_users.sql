INSERT INTO users (email, password_hash, role, status, full_name, business_name, approved_at) VALUES 
('importer@test.com', '$2a$10$9nlip3tQd5FaWr3ClsrgCOZNss5vWKSsqoeRnwFNcyLm1oMweQMCm', 'IMPORTER', 'ACTIVE', 'Test Importer', 'Importer Co', now()),
('seller@test.com', '$2a$10$9nlip3tQd5FaWr3ClsrgCOZNss5vWKSsqoeRnwFNcyLm1oMweQMCm', 'SELLER', 'ACTIVE', 'Test Seller', 'Seller Co', now()),
('customs@test.com', '$2a$10$9nlip3tQd5FaWr3ClsrgCOZNss5vWKSsqoeRnwFNcyLm1oMweQMCm', 'CUSTOMS', 'ACTIVE', 'Test Customs', NULL, now()),
('esl@test.com', '$2a$10$9nlip3tQd5FaWr3ClsrgCOZNss5vWKSsqoeRnwFNcyLm1oMweQMCm', 'ESL_AGENT', 'ACTIVE', 'Test ESL', NULL, now()),
('transporter@test.com', '$2a$10$9nlip3tQd5FaWr3ClsrgCOZNss5vWKSsqoeRnwFNcyLm1oMweQMCm', 'TRANSPORTER', 'ACTIVE', 'Test Transporter', 'Transporter Co', now())
ON CONFLICT (email) DO UPDATE SET status = 'ACTIVE';
