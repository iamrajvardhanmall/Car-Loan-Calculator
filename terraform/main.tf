terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# 1. Security Group: Firewall rules for Windows RDP, Web, API
resource "aws_security_group" "carloan_sg" {
  name        = "carloan-windows-sg"
  description = "Allow inbound RDP, WinRM, HTTP, and Microservice traffic"

  # RDP Access (Port 3389 for Windows Remote Desktop)
  ingress {
    description = "Remote Desktop Protocol (RDP)"
    from_port   = 3389
    to_port     = 3389
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # WinRM HTTP (Port 5985 for Remote PowerShell)
  ingress {
    description = "WinRM HTTP"
    from_port   = 5985
    to_port     = 5985
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Django Web Gateway (Port 8000)
  ingress {
    description = "Django Web Application"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Standard HTTP (Port 80)
  ingress {
    description = "Standard HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # AI Valuation Microservice (Port 5001)
  ingress {
    description = "AI Valuation Microservice"
    from_port   = 5001
    to_port     = 5001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # PDF Generator Microservice (Port 5002)
  ingress {
    description = "PDF Generator Microservice"
    from_port   = 5002
    to_port     = 5002
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound: Allow all outbound Internet access
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "carloan-windows-security-group"
    Environment = var.environment
  }
}

# 2. Get latest official Windows Server 2022 Base AMI
data "aws_ami" "windows" {
  most_recent = true
  owners      = ["801119661308"] # Amazon official Windows AMIs

  filter {
    name   = "name"
    values = ["Windows_Server-2022-English-Full-Base-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# 3. Provision the Windows EC2 Instance
resource "aws_instance" "carloan_server" {
  ami                    = data.aws_ami.windows.id
  instance_type          = var.instance_type
  key_name               = var.key_name != "" ? var.key_name : null
  vpc_security_group_ids = [aws_security_group.carloan_sg.id]

  # Root storage volume (Windows Server requires at least 30 GB SSD)
  root_block_device {
    volume_size           = 40
    volume_type           = "gp3"
    delete_on_termination = true
  }

  # Automated Startup Script (PowerShell User Data)
  user_data = file("${path.module}/user_data.ps1")

  tags = {
    Name        = "CarLoan-Windows-Server"
    Environment = var.environment
    Project     = "CarLoanCalculator"
    OS          = "Windows Server 2022"
  }
}

# 4. Allocate a Static Elastic IP (EIP)
resource "aws_eip" "carloan_eip" {
  instance = aws_instance.carloan_server.id
  domain   = "vpc"

  tags = {
    Name        = "carloan-windows-elastic-ip"
    Environment = var.environment
  }
}
