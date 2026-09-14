#!/bin/bash
set -e

# Update packages and install prerequisites
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release git

# Add Docker official GPG key
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine & Docker Compose plugin
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin docker-compose

# Enable & start Docker service
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

# Clone the CarLoan repository and start microservices
cd /home/ubuntu
git clone -b Raj https://github.com/iamrajvardhanmall/Car-Loan-Calculator.git carloan_app || true

if [ -d "carloan_app" ]; then
  cd carloan_app
  # Copy .env.example to .env
  cp .env.example .env || true
  # Run all microservices
  docker compose up -d --build
fi
