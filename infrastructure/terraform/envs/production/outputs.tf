output "app_url" {
  value = module.alb.app_url
}

output "cluster_name" {
  value = module.ecs.cluster_name
}

output "backend_secret_name" {
  description = "Put MONGODB_URI (and later JWT/payment keys) here before the first deploy."
  value       = module.secrets.backend_secret_name
}

output "media_bucket" {
  value = module.media.bucket_name
}

output "cdn_url" {
  value = module.media.cdn_url
}

output "nat_public_ips" {
  description = "Add to the MongoDB Atlas IP access list (unless you set up VPC peering)."
  value       = module.network.nat_public_ips
}

output "alarm_topic_arn" {
  value = module.monitoring.alarm_topic_arn
}
