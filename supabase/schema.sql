-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'player' CHECK (role IN ('admin', 'player')),
  account_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  amount NUMERIC NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  payment_method TEXT CHECK (payment_method IN ('cash', 'transfer')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create monthly_fees table
CREATE TABLE IF NOT EXISTS monthly_fees (
  id SERIAL PRIMARY KEY,
  month DATE NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for monthly_fees
ALTER TABLE monthly_fees ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for MVP)

-- Users: Admin can view all, users can view their own
CREATE POLICY "Admin can view all users" ON users FOR SELECT USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);

-- Payments: Admin can view/edit all, users can view own and create
CREATE POLICY "Admin can view all payments" ON payments FOR SELECT USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create payments" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can update payments" ON payments FOR UPDATE USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

-- Monthly Fees: Admin can manage, everyone can view
CREATE POLICY "Everyone can view fees" ON monthly_fees FOR SELECT USING (true);
CREATE POLICY "Admin can manage fees" ON monthly_fees FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

-- Initial Seed Data
INSERT INTO monthly_fees (month, amount) VALUES (CURRENT_DATE, 5000);
