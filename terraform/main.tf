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

# 1. Security Group: Firewall rules for Web, API, SSH
resource "aws_security_group" "carloan_sg" {
  name        = "carloan-microservices-sg"
  description = "Allow inbound SSH, HTTP, and Microservice traffic"

  # SSH Access
  ingress {
    description = "SSH from anywhere"
    from_port   = 22
    to_port     = 22
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

  # Standard HTTP
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
    Name        = "carloan-security-group"
    Environment = var.environment
  }
}

# 2. Get latest official Ubuntu 22.04 LTS AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# 3. Provision the EC2 Instance
resource "aws_instance" "carloan_server" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.key_name != "" ? var.key_name : null
  vpc_security_group_ids = [aws_security_group.carloan_sg.id]

  # Root storage volume (20 GB SSD)
  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
  }

  # Automated Startup Script (Installs Docker & clones repo)
  user_data = file("${path.module}/user_data.sh")

  tags = {
    Name        = "CarLoan-Microservices-Server"
    Environment = var.environment
    Project     = "CarLoanCalculator"
  }
}

# 4. Allocate a Static Elastic IP (EIP)
resource "aws_eip" "carloan_eip" {
  instance = aws_instance.carloan_server.id
  domain   = "vpc"

  tags = {
    Name        = "carloan-elastic-ip"
    Environment = var.environment
  }
}
