variable "region" {
  description = "AWS region for this environment."
  type        = string
  default     = "eu-west-1"
}

variable "domain_name" {
  description = "Hostname for this environment, e.g. app.example.com."
  type        = string
}

variable "hosted_zone_name" {
  description = "Route 53 public hosted zone, e.g. example.com."
  type        = string
}

variable "alarm_email" {
  description = "Where CloudWatch alarms are emailed. Empty = no email."
  type        = string
  default     = ""
}

variable "backend_secret_keys" {
  description = "Keys you must put in the rbc/<env>/backend secret. Add JWT and payment keys here as the backend starts reading them."
  type        = list(string)
  default     = ["MONGODB_URI", "JWT_ACCESS_SECRET"]
}

variable "initial_image_tag" {
  description = "Image tag used when the services are first created. Push this tag to ECR before the first apply."
  type        = string
  default     = "latest"
}
