output "server_public_ip" {
  description = "Static Public Elastic IP of the CarLoan server"
  value       = aws_eip.carloan_eip.public_ip
}

output "web_application_url" {
  description = "Public URL to access the Django Web Application"
  value       = "http://${aws_eip.carloan_eip.public_ip}:8000"
}

output "ai_valuation_url" {
  description = "Public URL to access the AI Valuation Microservice"
  value       = "http://${aws_eip.carloan_eip.public_ip}:5001/health"
}

output "pdf_service_url" {
  description = "Public URL to access the PDF Generator Microservice"
  value       = "http://${aws_eip.carloan_eip.public_ip}:5002/health"
}

output "ssh_command" {
  description = "Command to SSH into the EC2 instance"
  value       = "ssh -i your-key.pem ubuntu@${aws_eip.carloan_eip.public_ip}"
}
