variable "repository_names" {
  description = "ECR repositories to create."
  type        = list(string)
  default     = ["readers-bookclub-frontend", "readers-bookclub-backend"]
}

variable "keep_build_images" {
  description = "How many build images to keep per repository (release versions are always kept)."
  type        = number
  default     = 20
}
