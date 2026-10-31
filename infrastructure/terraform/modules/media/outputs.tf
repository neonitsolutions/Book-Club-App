output "bucket_name" {
  value = aws_s3_bucket.this.bucket
}

output "bucket_arn" {
  value = aws_s3_bucket.this.arn
}

output "cdn_url" {
  description = "Public base URL for media, e.g. https://d1234abcd.cloudfront.net."
  value       = "https://${aws_cloudfront_distribution.this.domain_name}"
}
