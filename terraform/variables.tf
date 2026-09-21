variable "aws_region" {
  description = "AWS region to deploy the infrastructure"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 Instance type (t3.medium or t3.large recommended for Windows Server)"
  type        = string
  default     = "t3.medium"
}

variable "key_name" {
  description = "Name of an existing AWS Key Pair (REQUIRED to decrypt Windows Administrator password)"
  type        = string
  default     = ""
}

variable "environment" {
  description = "Environment name (e.g. production, staging, dev)"
  type        = string
  default     = "production"
}
