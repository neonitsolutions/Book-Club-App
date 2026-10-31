variable "name" {
  description = "Cluster name and resource prefix, e.g. rbc-production. The Jenkinsfile deploys to this cluster name."
  type        = string
}

variable "region" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "frontend_security_group_id" {
  type = string
}

variable "backend_security_group_id" {
  type = string
}

variable "target_group_arns" {
  description = "Map with keys frontend and backend."
  type        = map(string)
}

variable "log_group_names" {
  description = "Map with keys frontend and backend."
  type        = map(string)
}

variable "frontend_image" {
  description = "ECR repository URL without a tag."
  type        = string
}

variable "backend_image" {
  description = "ECR repository URL without a tag."
  type        = string
}

variable "image_tag" {
  description = "Tag used when Terraform first creates the task definitions. After that Jenkins sets the image."
  type        = string
  default     = "latest"
}

variable "frontend" {
  description = "Size and task count of the frontend service. cpu: 256 = 0.25 vCPU; memory in MB."
  type = object({
    cpu       = number
    memory    = number
    min_count = number
    max_count = number
  })
}

variable "backend" {
  description = "Size and task count of the backend service."
  type = object({
    cpu       = number
    memory    = number
    min_count = number
    max_count = number
  })
}

variable "use_fargate_spot" {
  description = "Run on Fargate Spot (about 70% cheaper, tasks can be interrupted). Fine for staging, not for production."
  type        = bool
  default     = false
}

variable "cpu_target_percent" {
  description = "Autoscaling adds tasks when average CPU goes above this."
  type        = number
  default     = 60
}

variable "app_url" {
  description = "Public URL of the app, used as the backend's CORS origin."
  type        = string
}

variable "log_level" {
  type    = string
  default = "info"
}

variable "media_bucket_name" {
  type = string
}

variable "media_bucket_arn" {
  type = string
}

variable "cdn_url" {
  type = string
}

variable "backend_secret_arn" {
  type = string
}

variable "backend_secret_keys" {
  description = "Keys of the hand-set backend secret to expose as environment variables. Every key must exist in the secret or the task will not start."
  type        = list(string)
}

variable "redis_secret_arn" {
  type = string
}

variable "backend_extra_environment" {
  description = "Extra plain (non-secret) environment variables for the backend."
  type        = map(string)
  default     = {}
}
