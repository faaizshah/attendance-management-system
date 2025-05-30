#!/bin/bash

echo "🚀 Setting up Attendance Management System..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Start PostgreSQL with Docker
echo "📦 Starting PostgreSQL database..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Update backend .env file
echo "📝 Creating backend .env file..."
cat > backend/.env << EOL
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/attendance_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
EOL

# Update frontend .env.local file
echo "📝 Creating frontend .env.local file..."
cat > frontend/.env.local << EOL
NEXT_PUBLIC_API_URL=http://localhost:5000/api
EOL

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate dev --name init

# Go back to root
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "1. Backend: cd backend && npm run dev"
echo "2. Frontend: cd frontend && npm run dev"
echo ""
echo "📌 Default credentials:"
echo "- Database: postgres/postgres123"
echo "- API URL: http://localhost:5000"
echo "- Frontend URL: http://localhost:3000" 