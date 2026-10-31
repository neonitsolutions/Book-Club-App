output "log_group_names" {
  description = "Map with keys frontend and backend."
  value       = { for service, group in aws_cloudwatch_log_group.service : service => group.name }
}

output "alarm_topic_arn" {
  value = aws_sns_topic.alarms.arn
}
