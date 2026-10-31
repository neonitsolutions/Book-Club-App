output "ecr_repository_urls" {
  value = module.ecr.repository_urls
}

output "jenkins_url" {
  value = module.jenkins.url
}

output "jenkins_instance_id" {
  description = "Shell access: aws ssm start-session --target <id>"
  value       = module.jenkins.instance_id
}

output "jenkins_public_ip" {
  value = module.jenkins.public_ip
}
