output "replication_group_id" {
  value = aws_elasticache_replication_group.this.id
}

output "cache_cluster_ids" {
  description = "Node IDs (rbc-production-001, -002, ...), used for CloudWatch alarms."
  value       = [for i in range(var.node_count) : format("%s-%03d", var.name, i + 1)]
}

output "url" {
  description = "Connection URL for the backend's REDIS_URL (TLS, with auth token)."
  value       = "rediss://:${random_password.auth_token.result}@${aws_elasticache_replication_group.this.primary_endpoint_address}:6379"
  sensitive   = true
}
