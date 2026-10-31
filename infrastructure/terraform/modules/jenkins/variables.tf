variable "name" {
  type    = string
  default = "rbc-jenkins"
}

variable "region" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_id" {
  description = "A public subnet (Jenkins gets an Elastic IP)."
  type        = string
}

variable "instance_type" {
  description = "t3.large (8 GB). Next.js builds run out of memory on smaller instances."
  type        = string
  default     = "t3.large"
}

variable "volume_size" {
  description = "Disk size in GB for Jenkins home and Docker layers."
  type        = number
  default     = 50
}

variable "snapshot_retention_days" {
  type    = number
  default = 14
}

variable "domain_name" {
  description = "Jenkins hostname, e.g. jenkins.example.com. Caddy gets a Let's Encrypt certificate for it."
  type        = string
}

variable "hosted_zone_name" {
  description = "Route 53 public hosted zone that holds domain_name."
  type        = string
}

variable "admin_cidrs" {
  description = "Addresses allowed to open the Jenkins UI, e.g. [\"102.89.1.2/32\"] for your home or office."
  type        = list(string)
}

variable "github_webhook_cidrs" {
  description = "GitHub's webhook source ranges. Check the \"hooks\" list at https://api.github.com/meta and update if it changes."
  type        = list(string)
  default     = ["192.30.252.0/22", "185.199.108.0/22", "140.82.112.0/20", "143.55.64.0/20"]
}

variable "ecr_repository_arns" {
  description = "Repositories the pipeline may push to."
  type        = list(string)
}

variable "ecs_cluster_prefix" {
  description = "The pipeline may deploy to clusters, task definitions and roles whose names start with this."
  type        = string
  default     = "rbc-"
}
