variable "name" {
  description = "Prefix for every resource name, e.g. rbc-production."
  type        = string
}

variable "region" {
  description = "AWS region, used for the S3 gateway endpoint."
  type        = string
}

variable "cidr" {
  description = "VPC address range, e.g. 10.0.0.0/16."
  type        = string
}

variable "az_count" {
  description = "Number of availability zones to spread subnets across."
  type        = number
  default     = 2
}

variable "nat_gateway_count" {
  description = "0 = no outbound internet from private subnets, 1 = shared (cheaper), az_count = one per zone (resilient)."
  type        = number
  default     = 1

  validation {
    condition     = var.nat_gateway_count >= 0 && var.nat_gateway_count <= var.az_count
    error_message = "nat_gateway_count must be between 0 and az_count."
  }
}

variable "create_app_security_groups" {
  description = "Create the ALB, frontend, backend and Redis security groups. False for the shared (Jenkins) network."
  type        = bool
  default     = true
}
