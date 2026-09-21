<powershell>
# Windows EC2 User Data - Bootstrap Script for CarLoan Microservices
$ErrorActionPreference = "Continue"

# 1. Install Chocolatey Package Manager
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 2. Install Git and Docker Desktop / Docker CLI
choco install git -y --no-progress
choco install docker-cli -y --no-progress
choco install docker-compose -y --no-progress

# 3. Create app directory and clone repository
New-Item -ItemType Directory -Force -Path "C:\CarLoanApp"
Set-Location "C:\CarLoanApp"

git clone -b Raj https://github.com/iamrajvardhanmall/Car-Loan-Calculator.git .

# 4. Prepare environment file
if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env" -Force
}

# 5. Launch containers (if Docker daemon is active)
# docker compose up -d --build
</powershell>
