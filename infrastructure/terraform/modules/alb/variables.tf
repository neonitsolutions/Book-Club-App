variable "name" {
  description = "Load balancer name, e.g. rbc-production (max 23 characters so target group names fit)."
  type        = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "security_group_id" {
  type = string
}

variable "domain_name" {
  description = "Hostname the app is served on, e.g. app.example.com."
  type        = string
}

variable "hosted_zone_name" {
  description = "Route 53 public hosted zone that holds domain_name, e.g. example.com."
  type        = string
}

variable "deletion_protection" {
  description = "Stop the load balancer from being deleted by accident. True in production."
  type        = bool
  default     = false
}

variable "enable_waf" {
  type    = bool
  default = true
}

variable "auth_rate_limit" {
  description = "Max requests per IP to /api/auth/* in any 5-minute window before WAF blocks it."
  type        = number
  default     = 100
}
