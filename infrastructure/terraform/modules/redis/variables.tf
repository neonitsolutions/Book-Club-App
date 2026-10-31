variable "name" {
  description = "Replication group ID, e.g. rbc-production (lowercase, max 40 characters)."
  type        = string
}

variable "subnet_ids" {
  description = "Private subnets for the cache nodes."
  type        = list(string)
}

variable "security_group_id" {
  description = "Security group that only allows the backend in."
  type        = string
}

variable "node_type" {
  type    = string
  default = "cache.t4g.micro"
}

variable "node_count" {
  description = "1 = single node, 2+ = primary plus replicas with automatic failover."
  type        = number
  default     = 1
}

variable "engine_version" {
  type    = string
  default = "7.1"
}

variable "parameter_group_name" {
  type    = string
  default = "default.redis7"
}

variable "snapshot_retention_days" {
  description = "Daily snapshots to keep; 0 turns snapshots off."
  type        = number
  default     = 1
}

variable "apply_immediately" {
  description = "Apply changes now instead of in the maintenance window."
  type        = bool
  default     = false
}
