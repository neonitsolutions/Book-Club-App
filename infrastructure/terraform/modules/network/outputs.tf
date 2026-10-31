output "vpc_id" {
  value = aws_vpc.this.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "nat_public_ips" {
  description = "Outbound addresses of the private subnets. Add these to the MongoDB Atlas IP access list if you are not using VPC peering."
  value       = aws_eip.nat[*].public_ip
}

output "alb_security_group_id" {
  value = one(aws_security_group.alb[*].id)
}

output "frontend_security_group_id" {
  value = one(aws_security_group.frontend[*].id)
}

output "backend_security_group_id" {
  value = one(aws_security_group.backend[*].id)
}

output "redis_security_group_id" {
  value = one(aws_security_group.redis[*].id)
}
