locals {
  # Everything that differs between the two services lives here; the task
  # definition, service and autoscaling resources below are shared.
  services = {
    frontend = {
      image             = "${var.frontend_image}:${var.image_tag}"
      port              = 3000
      health_path       = "/"
      cpu               = var.frontend.cpu
      memory            = var.frontend.memory
      min_count         = var.frontend.min_count
      max_count         = var.frontend.max_count
      security_group_id = var.frontend_security_group_id
      task_role_arn     = aws_iam_role.frontend_task.arn
      environment = {
        NODE_ENV = "production"
        PORT     = "3000"
        HOSTNAME = "0.0.0.0"
        # Server Components call the backend over ECS Service Connect, not the internet
        INTERNAL_API_URL = "http://backend:3001"
      }
      secrets = []
    }

    backend = {
      image             = "${var.backend_image}:${var.image_tag}"
      port              = 3001
      health_path       = "/api/health"
      cpu               = var.backend.cpu
      memory            = var.backend.memory
      min_count         = var.backend.min_count
      max_count         = var.backend.max_count
      security_group_id = var.backend_security_group_id
      task_role_arn     = aws_iam_role.backend_task.arn
      environment = merge({
        NODE_ENV     = "production"
        PORT         = "3001"
        CORS_ORIGIN  = var.app_url
        LOG_LEVEL    = var.log_level
        MEDIA_BUCKET = var.media_bucket_name
        CDN_URL      = var.cdn_url
      }, var.backend_extra_environment)
      secrets = concat(
        [for key in var.backend_secret_keys : { name = key, valueFrom = "${var.backend_secret_arn}:${key}::" }],
        [{ name = "REDIS_URL", valueFrom = "${var.redis_secret_arn}:REDIS_URL::" }],
      )
    }
  }
}

# ---------------------------------------------------------------------------
# Cluster
# ---------------------------------------------------------------------------

resource "aws_service_discovery_http_namespace" "this" {
  name        = var.name
  description = "Service Connect namespace for ${var.name}"
}

resource "aws_ecs_cluster" "this" {
  name = var.name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  service_connect_defaults {
    namespace = aws_service_discovery_http_namespace.this.arn
  }
}

resource "aws_ecs_cluster_capacity_providers" "this" {
  cluster_name       = aws_ecs_cluster.this.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]
}

# ---------------------------------------------------------------------------
# IAM: the execution role starts containers; task roles are what the app can do
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "ecs_tasks_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = "${var.name}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "execution_secrets" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [var.backend_secret_arn, var.redis_secret_arn]
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  name   = "read-app-secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_secrets.json
}

# `aws ecs execute-command` (a shell inside a running container for debugging)
data "aws_iam_policy_document" "ecs_exec" {
  statement {
    actions = [
      "ssmmessages:CreateControlChannel",
      "ssmmessages:CreateDataChannel",
      "ssmmessages:OpenControlChannel",
      "ssmmessages:OpenDataChannel",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role" "frontend_task" {
  name               = "${var.name}-frontend-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

resource "aws_iam_role_policy" "frontend_exec" {
  name   = "ecs-exec"
  role   = aws_iam_role.frontend_task.id
  policy = data.aws_iam_policy_document.ecs_exec.json
}

resource "aws_iam_role" "backend_task" {
  name               = "${var.name}-backend-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

resource "aws_iam_role_policy" "backend_exec" {
  name   = "ecs-exec"
  role   = aws_iam_role.backend_task.id
  policy = data.aws_iam_policy_document.ecs_exec.json
}

data "aws_iam_policy_document" "backend_app" {
  statement {
    sid       = "MediaObjects"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${var.media_bucket_arn}/*"]
  }

  statement {
    sid       = "MediaList"
    actions   = ["s3:ListBucket"]
    resources = [var.media_bucket_arn]
  }

  statement {
    sid       = "SendEmail"
    actions   = ["ses:SendEmail", "ses:SendRawEmail"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "backend_app" {
  name   = "app-permissions"
  role   = aws_iam_role.backend_task.id
  policy = data.aws_iam_policy_document.backend_app.json
}

# ---------------------------------------------------------------------------
# Task definitions and services
# ---------------------------------------------------------------------------

resource "aws_ecs_task_definition" "this" {
  for_each = local.services

  family                   = "${var.name}-${each.key}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = each.value.task_role_arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([
    {
      name      = each.key
      image     = each.value.image
      essential = true

      portMappings = [{
        name          = "http"
        containerPort = each.value.port
        protocol      = "tcp"
        appProtocol   = "http"
      }]

      environment = [for key, value in each.value.environment : { name = key, value = value }]
      secrets     = each.value.secrets

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = var.log_group_names[each.key]
          awslogs-region        = var.region
          awslogs-stream-prefix = each.key
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget -qO- http://localhost:${each.value.port}${each.value.health_path} > /dev/null || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }
    }
  ])

  # Keep old revisions registered so a rollback is always one command away
  skip_destroy = true
}

resource "aws_ecs_service" "this" {
  for_each = local.services

  name            = each.key
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.this[each.key].arn
  desired_count   = each.value.min_count

  enable_execute_command            = true
  health_check_grace_period_seconds = 60
  propagate_tags                    = "SERVICE"
  enable_ecs_managed_tags           = true

  # New tasks start and pass health checks before old ones stop
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  capacity_provider_strategy {
    capacity_provider = var.use_fargate_spot ? "FARGATE_SPOT" : "FARGATE"
    weight            = 1
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [each.value.security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arns[each.key]
    container_name   = each.key
    container_port   = each.value.port
  }

  # The backend is reachable inside the cluster as http://backend:3001
  service_connect_configuration {
    enabled   = true
    namespace = aws_service_discovery_http_namespace.this.arn

    dynamic "service" {
      for_each = each.key == "backend" ? [each.value.port] : []

      content {
        port_name      = "http"
        discovery_name = "backend"

        client_alias {
          dns_name = "backend"
          port     = service.value
        }
      }
    }
  }

  lifecycle {
    # Jenkins deploys new images and autoscaling changes the task count;
    # Terraform must not undo either on the next apply.
    ignore_changes = [task_definition, desired_count]
  }

  depends_on = [aws_ecs_cluster_capacity_providers.this, aws_iam_role_policy.execution_secrets]
}

# ---------------------------------------------------------------------------
# Autoscaling on CPU
# ---------------------------------------------------------------------------

resource "aws_appautoscaling_target" "this" {
  for_each = local.services

  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.this.name}/${aws_ecs_service.this[each.key].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = each.value.min_count
  max_capacity       = each.value.max_count
}

resource "aws_appautoscaling_policy" "cpu" {
  for_each = local.services

  name               = "${var.name}-${each.key}-cpu"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = aws_appautoscaling_target.this[each.key].service_namespace
  resource_id        = aws_appautoscaling_target.this[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.this[each.key].scalable_dimension

  target_tracking_scaling_policy_configuration {
    target_value       = var.cpu_target_percent
    scale_in_cooldown  = 300
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}
