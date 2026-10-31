resource "aws_ecr_repository" "this" {
  for_each = toset(var.repository_names)

  name = each.key
  # Mutable so `latest` can move; deployments always use the unique <build>-<sha> tag
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

# Rules are checked in priority order, and an image matched by one rule is
# never expired by a later one. Rule 1 therefore protects release versions.
resource "aws_ecr_lifecycle_policy" "this" {
  for_each = aws_ecr_repository.this

  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep every release version (1.0.0, 2.3.1, ...)"
        selection = {
          tagStatus      = "tagged"
          tagPatternList = ["*.*.*"]
          countType      = "imageCountMoreThan"
          countNumber    = 9999
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Delete untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 3
        description  = "Keep the last ${var.keep_build_images} build images"
        selection = {
          tagStatus      = "tagged"
          tagPatternList = ["*"]
          countType      = "imageCountMoreThan"
          countNumber    = var.keep_build_images
        }
        action = { type = "expire" }
      },
    ]
  })
}
