resource "aws_elasticache_subnet_group" "this" {
  name       = var.name
  subnet_ids = var.subnet_ids
}

# Alphanumeric only: ElastiCache rejects @, " and / in auth tokens
resource "random_password" "auth_token" {
  length  = 32
  special = false
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id = var.name
  description          = "Redis cache and queue for ${var.name}"

  engine               = "redis"
  engine_version       = var.engine_version
  parameter_group_name = var.parameter_group_name
  node_type            = var.node_type
  num_cache_clusters   = var.node_count
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.this.name
  security_group_ids = [var.security_group_id]

  # A replica in a second zone takes over automatically when there are 2+ nodes
  automatic_failover_enabled = var.node_count > 1
  multi_az_enabled           = var.node_count > 1

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.auth_token.result

  snapshot_retention_limit = var.snapshot_retention_days
  snapshot_window          = "02:00-03:00"
  maintenance_window       = "sun:03:30-sun:04:30"

  apply_immediately = var.apply_immediately
}
