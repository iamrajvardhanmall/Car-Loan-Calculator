variable "aws_region" {
  description = "AWS region to deploy the infrastructure"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 Instance type (t3.small recommended, or t2.micro for free tier)"
  type        = string
  default     = "t3.small"
}

variable "key_name" {
  description = "Name of an existing AWS Key Pair (optional, for SSH access)"
  type        = string
  default     = ""
}

variable "environment" {
  description = "Environment name (e.g. production, staging, dev)"
  type        = string
  default     = "production"
}
