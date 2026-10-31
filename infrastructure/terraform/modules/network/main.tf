data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, var.az_count)
  # 1 when the app security groups are wanted, 0 for networks that only host Jenkins
  app = var.create_app_security_groups ? 1 : 0
}

# ---------------------------------------------------------------------------
# VPC and subnets
# ---------------------------------------------------------------------------

resource "aws_vpc" "this" {
  cidr_block           = var.cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = var.name }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = { Name = var.name }
}

# 10.x.0.0/24, 10.x.1.0/24 ... : load balancer, NAT gateways, Jenkins
resource "aws_subnet" "public" {
  count = var.az_count

  vpc_id                  = aws_vpc.this.id
  cidr_block              = cidrsubnet(var.cidr, 8, count.index)
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = { Name = "${var.name}-public-${local.azs[count.index]}", Tier = "public" }
}

# 10.x.10.0/24, 10.x.11.0/24 ... : containers and Redis, no public addresses
resource "aws_subnet" "private" {
  count = var.az_count

  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.cidr, 8, count.index + 10)
  availability_zone = local.azs[count.index]

  tags = { Name = "${var.name}-private-${local.azs[count.index]}", Tier = "private" }
}

# ---------------------------------------------------------------------------
# Routing
# ---------------------------------------------------------------------------

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  tags = { Name = "${var.name}-public" }
}

resource "aws_route_table_association" "public" {
  count = var.az_count

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_eip" "nat" {
  count = var.nat_gateway_count

  domain = "vpc"

  tags = { Name = "${var.name}-nat-${count.index}" }
}

resource "aws_nat_gateway" "this" {
  count = var.nat_gateway_count

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = { Name = "${var.name}-${local.azs[count.index]}" }

  depends_on = [aws_internet_gateway.this]
}

resource "aws_route_table" "private" {
  count = var.az_count

  vpc_id = aws_vpc.this.id

  tags = { Name = "${var.name}-private-${local.azs[count.index]}" }
}

# With fewer NAT gateways than zones, zones share them round-robin
resource "aws_route" "private_nat" {
  count = var.nat_gateway_count > 0 ? var.az_count : 0

  route_table_id         = aws_route_table.private[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.this[count.index % var.nat_gateway_count].id
}

resource "aws_route_table_association" "private" {
  count = var.az_count

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Free gateway endpoint: S3 traffic (media, ECR image layers) skips the NAT gateway
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.this.id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = aws_route_table.private[*].id

  tags = { Name = "${var.name}-s3" }
}

# ---------------------------------------------------------------------------
# Security groups: internet -> ALB -> frontend/backend -> Redis
# ---------------------------------------------------------------------------

resource "aws_security_group" "alb" {
  count = local.app

  name        = "${var.name}-alb"
  description = "Load balancer: HTTPS from the internet"
  vpc_id      = aws_vpc.this.id

  tags = { Name = "${var.name}-alb" }
}

resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  count = local.app

  security_group_id = aws_security_group.alb[0].id
  description       = "HTTPS from anywhere"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  count = local.app

  security_group_id = aws_security_group.alb[0].id
  description       = "HTTP from anywhere, redirected to HTTPS"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
}

resource "aws_vpc_security_group_egress_rule" "alb_to_vpc" {
  count = local.app

  security_group_id = aws_security_group.alb[0].id
  description       = "To containers inside the VPC"
  cidr_ipv4         = var.cidr
  ip_protocol       = "tcp"
  from_port         = 3000
  to_port           = 3001
}

resource "aws_security_group" "frontend" {
  count = local.app

  name        = "${var.name}-frontend"
  description = "Next.js containers"
  vpc_id      = aws_vpc.this.id

  tags = { Name = "${var.name}-frontend" }
}

resource "aws_vpc_security_group_ingress_rule" "frontend_from_alb" {
  count = local.app

  security_group_id            = aws_security_group.frontend[0].id
  description                  = "From the load balancer"
  referenced_security_group_id = aws_security_group.alb[0].id
  ip_protocol                  = "tcp"
  from_port                    = 3000
  to_port                      = 3000
}

resource "aws_vpc_security_group_egress_rule" "frontend_all" {
  count = local.app

  security_group_id = aws_security_group.frontend[0].id
  description       = "Backend, ECR, CloudWatch, Secrets Manager"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_security_group" "backend" {
  count = local.app

  name        = "${var.name}-backend"
  description = "NestJS containers"
  vpc_id      = aws_vpc.this.id

  tags = { Name = "${var.name}-backend" }
}

resource "aws_vpc_security_group_ingress_rule" "backend_from_alb" {
  count = local.app

  security_group_id            = aws_security_group.backend[0].id
  description                  = "From the load balancer (/api/*)"
  referenced_security_group_id = aws_security_group.alb[0].id
  ip_protocol                  = "tcp"
  from_port                    = 3001
  to_port                      = 3001
}

resource "aws_vpc_security_group_ingress_rule" "backend_from_frontend" {
  count = local.app

  security_group_id            = aws_security_group.backend[0].id
  description                  = "From Next.js server components (ECS Service Connect)"
  referenced_security_group_id = aws_security_group.frontend[0].id
  ip_protocol                  = "tcp"
  from_port                    = 3001
  to_port                      = 3001
}

resource "aws_vpc_security_group_egress_rule" "backend_all" {
  count = local.app

  security_group_id = aws_security_group.backend[0].id
  description       = "Redis, MongoDB Atlas, payment gateways, AWS APIs"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_security_group" "redis" {
  count = local.app

  name        = "${var.name}-redis"
  description = "ElastiCache Redis: backend only"
  vpc_id      = aws_vpc.this.id

  tags = { Name = "${var.name}-redis" }
}

resource "aws_vpc_security_group_ingress_rule" "redis_from_backend" {
  count = local.app

  security_group_id            = aws_security_group.redis[0].id
  description                  = "From the backend"
  referenced_security_group_id = aws_security_group.backend[0].id
  ip_protocol                  = "tcp"
  from_port                    = 6379
  to_port                      = 6379
}
