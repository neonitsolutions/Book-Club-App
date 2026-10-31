# Shared: one of each, used by both staging and production.
#   - ECR repositories for the two images
#   - The Jenkins server, in its own small VPC (public subnets only, no NAT gateway)

locals {
  name = "rbc-shared"
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "readers-book-club"
      Environment = "shared"
      ManagedBy   = "terraform"
    }
  }
}

module "ecr" {
  source = "../../modules/ecr"
}

module "network" {
  source = "../../modules/network"

  name                       = local.name
  region                     = var.region
  cidr                       = "10.10.0.0/16"
  nat_gateway_count          = 0
  create_app_security_groups = false
}

module "jenkins" {
  source = "../../modules/jenkins"

  region              = var.region
  vpc_id              = module.network.vpc_id
  subnet_id           = module.network.public_subnet_ids[0]
  instance_type       = var.jenkins_instance_type
  domain_name         = var.jenkins_domain_name
  hosted_zone_name    = var.hosted_zone_name
  admin_cidrs         = var.admin_cidrs
  ecr_repository_arns = module.ecr.repository_arns
}
