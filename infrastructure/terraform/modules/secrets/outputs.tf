output "backend_secret_arn" {
  value = aws_secretsmanager_secret.backend.arn
}

output "backend_secret_name" {
  value = aws_secretsmanager_secret.backend.name
}

output "redis_secret_arn" {
  value = aws_secretsmanager_secret.redis.arn
}
