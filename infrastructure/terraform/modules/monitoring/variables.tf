variable "name" {
  description = "Prefix for log groups, alarms and the SNS topic, e.g. rbc-production."
  type        = string
}

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "alarm_email" {
  description = "Email address that receives alarms. Empty = no subscription."
  type        = string
  default     = ""
}

variable "cluster_name" {
  type = string
}

variable "alb_arn_suffix" {
  type = string
}

variable "target_group_arn_suffixes" {
  description = "Map with keys frontend and backend."
  type        = map(string)
}

variable "redis_cache_cluster_ids" {
  type    = list(string)
  default = []
}

variable "http_5xx_threshold" {
  description = "5xx responses in 5 minutes that trigger an alarm."
  type        = number
  default     = 10
}
