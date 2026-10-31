variable "environment" {
  description = "staging or production; secrets are named rbc/<environment>/..."
  type        = string
}

variable "backend_secret_keys" {
  description = "JSON keys expected in the hand-set backend secret (documented in its description)."
  type        = list(string)
}

variable "redis_url" {
  description = "REDIS_URL stored in the Terraform-managed Redis secret."
  type        = string
  sensitive   = true
}

variable "recovery_window_in_days" {
  description = "Days a deleted secret can be restored; 0 deletes immediately."
  type        = number
  default     = 7
}
