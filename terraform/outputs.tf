output "server_public_ip" {
  description = "Static Public Elastic IP of the Windows CarLoan server"
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

output "rdp_connection_info" {
  description = "Connection details for Windows Remote Desktop (RDP)"
  value       = "RDP Address: ${aws_eip.carloan_eip.public_ip}:3389 | Username: Administrator (Get password from AWS Console using your Key Pair)"
}
