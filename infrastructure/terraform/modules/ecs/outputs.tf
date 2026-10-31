output "cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "service_names" {
  value = { for key, service in aws_ecs_service.this : key => service.name }
}

output "task_definition_families" {
  value = { for key, td in aws_ecs_task_definition.this : key => td.family }
}

output "task_role_arns" {
  value = {
    frontend = aws_iam_role.frontend_task.arn
    backend  = aws_iam_role.backend_task.arn
  }
}
