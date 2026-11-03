# Production: two of everything across two availability zones.
# Only the `settings` block differs between envs/staging and envs/production.

locals {
  environment = "production"
  name        = "rbc-${local.environment}"

  settings = {
    vpc_cidr            = "10.0.0.0/16"
    nat_gateway_count   = 2
    redis_node_type     = "cache.t4g.small"
    redis_node_count    = 2
    redis_snapshot_days = 7
    use_fargate_spot    = false
    frontend            = { cpu = 512, memory = 1024, min_count = 2, max_count = 4 }
    backend             = { cpu = 512, memory = 1024, min_count = 2, max_count = 6 }
    log_retention_days  = 30
    deletion_protection = true
    force_destroy_media = false
    secret_recovery     = 7
    # "false" while SES is in its sandbox: sign-up then signs people in
    # without an activation email. Set "true" once SES production access is
    # granted, then apply and deploy.
    require_email_verification = "false"
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "readers-book-club"
      Environment = local.environment
      ManagedBy   = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

# Created once by envs/shared
data "aws_ecr_repository" "frontend" {
  name = "readers-bookclub-frontend"
}

data "aws_ecr_repository" "backend" {
  name = "readers-bookclub-backend"
}

module "network" {
  source = "../../modules/network"

  name              = local.name
  region            = var.region
  cidr              = local.settings.vpc_cidr
  nat_gateway_count = local.settings.nat_gateway_count
}

module "redis" {
  source = "../../modules/redis"

  name                    = local.name
  subnet_ids              = module.network.private_subnet_ids
  security_group_id       = module.network.redis_security_group_id
  node_type               = local.settings.redis_node_type
  node_count              = local.settings.redis_node_count
  snapshot_retention_days = local.settings.redis_snapshot_days
}

module "secrets" {
  source = "../../modules/secrets"

  environment             = local.environment
  backend_secret_keys     = var.backend_secret_keys
  redis_url               = module.redis.url
  recovery_window_in_days = local.settings.secret_recovery
}

module "media" {
  source = "../../modules/media"

  bucket_name          = "rbc-media-${local.environment}-${data.aws_caller_identity.current.account_id}"
  cors_allowed_origins = ["https://${var.domain_name}"]
  force_destroy        = local.settings.force_destroy_media
}

module "alb" {
  source = "../../modules/alb"

  name                = local.name
  vpc_id              = module.network.vpc_id
  public_subnet_ids   = module.network.public_subnet_ids
  security_group_id   = module.network.alb_security_group_id
  domain_name         = var.domain_name
  hosted_zone_name    = var.hosted_zone_name
  deletion_protection = local.settings.deletion_protection
}

module "monitoring" {
  source = "../../modules/monitoring"

  name                      = local.name
  log_retention_days        = local.settings.log_retention_days
  alarm_email               = var.alarm_email
  cluster_name              = local.name
  alb_arn_suffix            = module.alb.alb_arn_suffix
  target_group_arn_suffixes = module.alb.target_group_arn_suffixes
  redis_cache_cluster_ids   = module.redis.cache_cluster_ids
}

module "ecs" {
  source = "../../modules/ecs"

  name                       = local.name
  region                     = var.region
  private_subnet_ids         = module.network.private_subnet_ids
  frontend_security_group_id = module.network.frontend_security_group_id
  backend_security_group_id  = module.network.backend_security_group_id
  target_group_arns          = module.alb.target_group_arns
  log_group_names            = module.monitoring.log_group_names

  frontend_image   = data.aws_ecr_repository.frontend.repository_url
  backend_image    = data.aws_ecr_repository.backend.repository_url
  image_tag        = var.initial_image_tag
  frontend         = local.settings.frontend
  backend          = local.settings.backend
  use_fargate_spot = local.settings.use_fargate_spot

  app_url             = module.alb.app_url
  media_bucket_name   = module.media.bucket_name
  media_bucket_arn    = module.media.bucket_arn
  cdn_url             = module.media.cdn_url
  mail_from           = "Readers Club <no-reply@${var.hosted_zone_name}>"
  backend_secret_arn  = module.secrets.backend_secret_arn
  backend_secret_keys = var.backend_secret_keys
  redis_secret_arn    = module.secrets.redis_secret_arn

  backend_extra_environment = {
    REQUIRE_EMAIL_VERIFICATION = local.settings.require_email_verification
  }

  # Target groups must be attached to the HTTPS listener before services use them
  depends_on = [module.alb]
}
