output "url" {
  value = "https://${var.domain_name}"
}

output "public_ip" {
  value = aws_eip.this.public_ip
}

output "instance_id" {
  description = "Connect with: aws ssm start-session --target <instance_id>"
  value       = aws_instance.this.id
}

output "role_arn" {
  value = aws_iam_role.this.arn
}
