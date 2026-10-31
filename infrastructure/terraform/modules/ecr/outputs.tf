output "repository_urls" {
  description = "Map of repository name to URL, e.g. 123456789012.dkr.ecr.eu-west-1.amazonaws.com/readers-bookclub-backend."
  value       = { for name, repo in aws_ecr_repository.this : name => repo.repository_url }
}

output "repository_arns" {
  value = [for repo in aws_ecr_repository.this : repo.arn]
}
