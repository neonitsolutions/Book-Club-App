# Run once, before anything else. Creates the S3 bucket that stores Terraform
# state for envs/shared, envs/staging and envs/production.
# This stack keeps its own (tiny) state locally: keep bootstrap/terraform.tfstate safe
# or simply re-import the bucket if it is ever lost.

terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

variable "region" {
  type    = string
  default = "eu-west-1"
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = "readers-book-club"
      ManagedBy = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "state" {
  bucket = "rbc-terraform-state-${data.aws_caller_identity.current.account_id}"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket = aws_s3_bucket.state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

output "backend_hcl" {
  description = "Paste into infrastructure/terraform/envs/backend.hcl"
  value       = <<-EOT
    bucket = "${aws_s3_bucket.state.bucket}"
    region = "${var.region}"
  EOT
}
