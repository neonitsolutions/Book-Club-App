# Values you set by hand (database URL, JWT keys, payment keys).
# Terraform creates the empty secret only and never writes or reads its value,
# so nothing sensitive ends up in Terraform state. Set it with:
#   aws secretsmanager put-secret-value --secret-id rbc/<env>/backend --secret-string file://backend-secret.json
resource "aws_secretsmanager_secret" "backend" {
  name                    = "rbc/${var.environment}/backend"
  description             = "Backend secrets set by hand. JSON keys: ${join(", ", var.backend_secret_keys)}"
  recovery_window_in_days = var.recovery_window_in_days
}

# Values Terraform generates itself
resource "aws_secretsmanager_secret" "redis" {
  name                    = "rbc/${var.environment}/redis"
  description             = "Redis connection URL, managed by Terraform"
  recovery_window_in_days = var.recovery_window_in_days
}

resource "aws_secretsmanager_secret_version" "redis" {
  secret_id     = aws_secretsmanager_secret.redis.id
  secret_string = jsonencode({ REDIS_URL = var.redis_url })
}
