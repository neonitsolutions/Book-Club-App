output "alb_arn_suffix" {
  description = "Used as the LoadBalancer dimension in CloudWatch alarms."
  value       = aws_lb.this.arn_suffix
}

output "alb_dns_name" {
  value = aws_lb.this.dns_name
}

output "https_listener_arn" {
  value = aws_lb_listener.https.arn
}

output "target_group_arns" {
  value = {
    frontend = aws_lb_target_group.frontend.arn
    backend  = aws_lb_target_group.backend.arn
  }
}

output "target_group_arn_suffixes" {
  value = {
    frontend = aws_lb_target_group.frontend.arn_suffix
    backend  = aws_lb_target_group.backend.arn_suffix
  }
}

output "app_url" {
  value = "https://${var.domain_name}"
}
