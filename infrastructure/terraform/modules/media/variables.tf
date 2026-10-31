variable "bucket_name" {
  description = "Globally unique bucket name, e.g. rbc-media-production-123456789012."
  type        = string
}

variable "cors_allowed_origins" {
  description = "Origins allowed to upload with pre-signed URLs, e.g. [\"https://app.example.com\"]."
  type        = list(string)
}

variable "price_class" {
  description = "PriceClass_200 includes edge locations in Africa; PriceClass_100 does not."
  type        = string
  default     = "PriceClass_200"
}

variable "noncurrent_version_days" {
  description = "Days to keep overwritten or deleted files before they are removed for good."
  type        = number
  default     = 30
}

variable "force_destroy" {
  description = "Allow `terraform destroy` to delete a bucket that still has files. Keep false in production."
  type        = bool
  default     = false
}
